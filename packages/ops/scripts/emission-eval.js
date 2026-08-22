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
import { catalog, createValidator } from './validate-stream.js';

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

// --pack / --contract point the harness at composed artifacts (see
// @aurilabs/core/compose and the docs /composer page): the composed pack
// becomes the system prompt, and the composed contract validates the output —
// so a model reaching for a component that was cut from the composition fails
// the eval instead of slipping through against the full contract.
const packPath = flag('pack') ?? join(contractDir, 'prompt.md');
const promptPack = readFileSync(packPath, 'utf8');
// Everything below the first horizontal rule is the pack; above it is repo
// framing. Composed packs have no rule and are used whole.
const rule = promptPack.indexOf('\n---\n');
const system = rule === -1 ? promptPack : promptPack.slice(rule + 5);

const contractPath = flag('contract');
const { validateStream } = createValidator(
	contractPath ? JSON.parse(readFileSync(contractPath, 'utf8')) : catalog
);

// --scenarios-file lets other catalogs (forms, compositions) bring their own
// scenario suites through this same harness.
const scenariosPath = flag('scenarios-file') ?? join(here, 'emission-scenarios.json');
const allScenarios = JSON.parse(readFileSync(scenariosPath, 'utf8'));
// --smoke runs only the scenarios flagged `"smoke": true` — the widest-coverage
// pair per catalog. That is what the nightly CI job runs: model drift shows up
// in the hardest scenarios first, and a nightly full sweep would burn credits
// to re-prove the easy ones. Contract changes still run everything.
const smokeOnly = process.argv.includes('--smoke');
const wantedScenarios = flag('scenarios')?.split(',');
const scenarios = wantedScenarios
	? allScenarios.filter((scenario) => wantedScenarios.includes(scenario.id))
	: smokeOnly
		? allScenarios.filter((scenario) => scenario.smoke === true)
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
			const { errors, componentsSeen, classes } = validateStream(jsonl);
			result = {
				ok: errors.length === 0 && jsonl.length > 0,
				errors: jsonl.length > 0 ? errors : ['no JSONL found in output'],
				classes: jsonl.length > 0 ? [...classes] : ['no-output'],
				components: [...componentsSeen],
				proseLines,
				// Kept for the results JSON (scoreboard transcripts, spot-checks); not printed.
				raw: output
			};
			if (result.ok) result.errors = [];
		} catch (cause) {
			result = {
				ok: false,
				errors: [`call failed: ${cause.message}`],
				classes: ['call-failed'],
				components: [],
				proseLines: 0
			};
		}
		const ms = Date.now() - started;
		results.push({ model: spec, scenario: scenario.id, ms, ...result });
		const mark = result.ok ? 'PASS' : `FAIL[${(result.classes ?? []).join(',')}]`;
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

/*
 * Failure classes are the triage signal. `malformed-syntax` is a model slip on
 * a deep structure and recurs at a low rate; the others mean our contract or
 * pack is teaching something a model cannot reliably emit, which is a
 * contract-first bug and never a prompt patch.
 */
if (failed > 0) {
	const tally = {};
	for (const r of results.filter((x) => !x.ok)) {
		for (const c of r.classes ?? []) tally[c] = (tally[c] ?? 0) + 1;
	}
	const worrying = Object.keys(tally).filter((c) => c !== 'malformed-syntax');
	console.log(
		'failure classes: ' +
			Object.entries(tally)
				.map(([c, n]) => `${c}=${n}`)
				.join(', ')
	);
	console.log(
		worrying.length > 0
			? '  -> contract/pack problem: fix the contract, never the prompt.'
			: '  -> model slip only (malformed syntax). Re-run to see whether it is a rate or a regression.'
	);
}

const jsonPath = flag('json');
if (jsonPath) {
	writeFileSync(jsonPath, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, '\t'));
	console.log(`results written to ${jsonPath}`);
}

process.exit(failed > 0 || results.length === 0 ? 1 : 0);
