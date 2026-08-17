/**
 * The emission-eval harness (PLAN 2.4, pillar 2): sends the prompt-pack cold to
 * a matrix of models, scores every emission against the contract with the same
 * validator the fixture tests use, and reports a model × scenario matrix.
 *
 * usage: node scripts/emission-eval.js [--models <provider:model,...>]
 *          [--scenarios <id,...>] [--json <path>] [--list]
 *
 * Providers activate on their env keys: ANTHROPIC_API_KEY, OPENAI_API_KEY,
 * GEMINI_API_KEY. `mock:pass` replays a fixture through the full pipeline for
 * offline testing of the harness itself.
 *
 *   OPENAI_API_KEY=sk-... node scripts/emission-eval.js --models openai:gpt-5.6
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateStream } from './validate-stream.js';

const here = dirname(fileURLToPath(import.meta.url));
const contractDir = join(here, '..', 'contract');

const DEFAULT_MODELS = ['anthropic:claude-opus-5', 'openai:gpt-5.6'];

/* ---------------------------------------------------------------- providers */

async function callAnthropic(model, system, user) {
	// Lazy import so the harness runs (mock/openai) without the SDK installed.
	const { default: Anthropic } = await import('@anthropic-ai/sdk');
	const client = new Anthropic();
	const response = await client.messages.create({
		model,
		max_tokens: 8192,
		system,
		messages: [{ role: 'user', content: user }]
	});
	if (response.stop_reason === 'refusal') {
		throw new Error(`model refused (stop_details: ${JSON.stringify(response.stop_details)})`);
	}
	return response.content
		.filter((block) => block.type === 'text')
		.map((block) => block.text)
		.join('');
}

async function callOpenai(model, system, user) {
	const response = await fetch('https://api.openai.com/v1/chat/completions', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			authorization: `Bearer ${process.env.OPENAI_API_KEY}`
		},
		body: JSON.stringify({
			model,
			messages: [
				{ role: 'system', content: system },
				{ role: 'user', content: user }
			]
		})
	});
	if (!response.ok) throw new Error(`openai ${response.status}: ${await response.text()}`);
	const body = await response.json();
	return body.choices[0].message.content ?? '';
}

async function callGemini(model, system, user) {
	const response = await fetch(
		`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
		{
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				'x-goog-api-key': process.env.GEMINI_API_KEY
			},
			body: JSON.stringify({
				systemInstruction: { parts: [{ text: system }] },
				contents: [{ role: 'user', parts: [{ text: user }] }]
			})
		}
	);
	if (!response.ok) throw new Error(`gemini ${response.status}: ${await response.text()}`);
	const body = await response.json();
	return (body.candidates?.[0]?.content?.parts ?? []).map((part) => part.text ?? '').join('');
}

function callMock() {
	return readFileSync(join(contractDir, 'examples', 'incident-brief.jsonl'), 'utf8');
}

const PROVIDERS = {
	anthropic: { call: callAnthropic, key: 'ANTHROPIC_API_KEY' },
	openai: { call: callOpenai, key: 'OPENAI_API_KEY' },
	gemini: { call: callGemini, key: 'GEMINI_API_KEY' },
	mock: { call: callMock, key: null }
};

/* ----------------------------------------------------------------- scoring */

/**
 * Models are told "JSONL only", but a cold session may still wrap output in
 * fences or prose. Schema errors fail the eval; prose is only counted — the
 * distinction matters when reading a scoreboard.
 */
function extractJsonl(text) {
	const lines = [];
	let proseLines = 0;
	for (const raw of text.split('\n')) {
		const line = raw.trim();
		if (!line || line.startsWith('```')) continue;
		if (line.startsWith('{')) lines.push(line);
		else proseLines += 1;
	}
	return { jsonl: lines.join('\n'), proseLines };
}

/* -------------------------------------------------------------------- main */

const args = process.argv.slice(2);
function flag(name) {
	const index = args.indexOf(`--${name}`);
	return index === -1 ? undefined : (args[index + 1] ?? '');
}

const promptPack = readFileSync(join(contractDir, 'prompt.md'), 'utf8');
// Everything below the first horizontal rule is the pack; above it is repo framing.
const system = promptPack.slice(promptPack.indexOf('\n---\n') + 5);

const allScenarios = JSON.parse(readFileSync(join(here, 'emission-scenarios.json'), 'utf8'));
const wantedScenarios = flag('scenarios')?.split(',');
const scenarios = wantedScenarios
	? allScenarios.filter((scenario) => wantedScenarios.includes(scenario.id))
	: allScenarios;

const modelSpecs = (flag('models')?.split(',') ?? DEFAULT_MODELS).map((spec) => {
	const [provider, ...rest] = spec.split(':');
	return { provider, model: rest.join(':') || null, spec };
});

if (args.includes('--list')) {
	console.log('models:   ', modelSpecs.map((m) => m.spec).join(', '));
	console.log('scenarios:', scenarios.map((s) => s.id).join(', '));
	process.exit(0);
}

const results = [];
for (const { provider, model, spec } of modelSpecs) {
	const providerDef = PROVIDERS[provider];
	if (!providerDef) {
		console.error(`skip ${spec}: unknown provider '${provider}'`);
		continue;
	}
	if (providerDef.key && !process.env[providerDef.key]) {
		console.error(`skip ${spec}: ${providerDef.key} not set`);
		continue;
	}
	for (const scenario of scenarios) {
		const started = Date.now();
		let result;
		try {
			const output = await providerDef.call(model, system, scenario.prompt);
			const { jsonl, proseLines } = extractJsonl(output);
			const { errors, componentsSeen } = validateStream(jsonl);
			result = {
				ok: errors.length === 0 && jsonl.length > 0,
				errors: jsonl.length > 0 ? errors : ['no JSONL found in output'],
				components: [...componentsSeen],
				proseLines
			};
			if (result.ok) result.errors = [];
		} catch (cause) {
			result = {
				ok: false,
				errors: [`call failed: ${cause.message}`],
				components: [],
				proseLines: 0
			};
		}
		const ms = Date.now() - started;
		results.push({ model: spec, scenario: scenario.id, ms, ...result });
		const mark = result.ok ? 'PASS' : 'FAIL';
		const extras = [
			result.components.length ? result.components.join('+') : null,
			result.proseLines ? `${result.proseLines} prose line(s)` : null
		]
			.filter(Boolean)
			.join(', ');
		console.log(`${mark}  ${spec}  ${scenario.id}  (${ms}ms${extras ? `; ${extras}` : ''})`);
		for (const error of result.errors) console.log(`      ${error}`);
	}
}

const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} passed`);

const jsonPath = flag('json');
if (jsonPath) {
	writeFileSync(jsonPath, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, '\t'));
	console.log(`results written to ${jsonPath}`);
}

process.exit(failed > 0 || results.length === 0 ? 1 : 0);
