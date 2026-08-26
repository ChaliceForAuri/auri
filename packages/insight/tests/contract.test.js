import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createValidator } from '../../ops/scripts/validate-stream.js';

const here = dirname(fileURLToPath(import.meta.url));
const contractDir = join(here, '..', 'contract');
const contract = JSON.parse(readFileSync(join(contractDir, 'catalog.json'), 'utf8'));
const { validateStream } = createValidator(contract);

/**
 * Properties of a COMPILED component. The compiler flattens away the authored
 * `allOf` + `componentCommon` wrapper (v1.0 catalog rule 5), so tests must read
 * the shipped shape — and must not fall back to `{}` when they don't find it.
 * Silent fallbacks are why the equivalent assertions in forms and intel passed
 * vacuously against the first compiled contract while asserting nothing at all.
 */
function own(name, schema) {
	assert.ok(schema.properties, `${name}: compiled component has no properties`);
	assert.ok(!schema.allOf, `${name}: compiled component must not carry allOf (rule 5)`);
	return { properties: schema.properties, required: schema.required ?? [] };
}

test('contract document is coherent', () => {
	assert.equal(contract.catalogId, contract.$id);
	assert.equal(Object.keys(contract.components).length, 5);
	for (const [name, schema] of Object.entries(contract.components)) {
		const { properties } = own(name, schema);
		assert.equal(properties.component?.const, name, `${name}: component const mismatch`);
	}
});

test('every component requires an accessible name', () => {
	// InsightCard's is its headline; everything else carries label (a11y principle 6).
	for (const [name, schema] of Object.entries(contract.components)) {
		const { required } = own(name, schema);
		const nameProp =
			name === 'InsightCard' ? 'headline' : name === 'DrillStack' ? 'levels' : 'label';
		assert.ok(required.includes(nameProp), `${name}: ${nameProp} must be required`);
	}
});

test('no component enumerates a domain: subjectKind and signalType are free strings', () => {
	// Contract principle 9. These were closed enums naming one company's entity
	// model and signal taxonomy, which made the catalog unusable by anyone else.
	const insight = own('InsightCard', contract.components.InsightCard);
	for (const prop of ['subjectKind', 'signalType']) {
		const schema = insight.properties[prop];
		assert.equal(schema.type, 'string', `${prop} must be a free string`);
		assert.ok(!schema.enum, `${prop} must not be a closed enum`);
	}
	// Still structural: a drillable card must say what it is about.
	assert.ok(insight.required.includes('subjectKind') && insight.required.includes('subjectId'));

	// And the whole catalog must be free of domain enums. UI-semantic enums stay.
	const UI_ENUMS = new Set([
		'good',
		'bad',
		'warning',
		'info',
		'neutral',
		'up',
		'down',
		'flat',
		'video',
		'audio'
	]);
	const walk = (node, path) => {
		if (Array.isArray(node)) return node.forEach((n, i) => walk(n, `${path}[${i}]`));
		if (!node || typeof node !== 'object') return;
		if (Array.isArray(node.enum)) {
			for (const v of node.enum) {
				assert.ok(
					UI_ENUMS.has(v),
					`${path}: enum value ${JSON.stringify(v)} is domain vocabulary, not a UI concept`
				);
			}
		}
		for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
	};
	for (const [name, schema] of Object.entries(contract.components)) walk(schema, name);
});

test('metrics replace the fixed domain figures, and carry their own intent', () => {
	const insight = own('InsightCard', contract.components.InsightCard);
	for (const gone of ['caseCount', 'revenueAtRisk', 'currency', 'themes']) {
		assert.ok(!(gone in insight.properties), `${gone} must not survive de-domaining`);
	}
	const metric = insight.properties.metrics.oneOf[0].items;
	assert.deepEqual(metric.required, ['label', 'value']);
	assert.ok(metric.properties.unit, 'metric carries a unit (ISO 4217 for money, like ops Stat)');
	assert.ok(metric.properties.intent, 'each metric carries its own intent');
});

test('confidence is bounded raw 0..1 — never a string, never a percentage', () => {
	const confidence = own('InsightCard', contract.components.InsightCard).properties.confidence;
	assert.equal(confidence.type, 'number');
	assert.equal(confidence.minimum, 0);
	assert.equal(confidence.maximum, 1);
});

test('every fixture replays clean through the contract validator', () => {
	const examples = join(contractDir, 'examples');
	const files = readdirSync(examples).filter((f) => f.endsWith('.jsonl'));
	assert.equal(files.length, 5, 'one fixture per component');
	for (const file of files) {
		const { errors } = validateStream(readFileSync(join(examples, file), 'utf8'));
		assert.deepEqual(errors, [], `${file} should validate`);
	}
});

test('fixtures collectively exercise all 5 components', () => {
	const examples = join(contractDir, 'examples');
	const seen = new Set();
	for (const file of readdirSync(examples).filter((f) => f.endsWith('.jsonl'))) {
		const { componentsSeen } = validateStream(readFileSync(join(examples, file), 'utf8'));
		for (const c of componentsSeen) seen.add(c);
	}
	assert.deepEqual([...seen].sort(), Object.keys(contract.components).sort());
});

test('the conformance suite grades THIS catalog', () => {
	/*
	 * A suite pinned to a superseded id still passes while grading a vocabulary
	 * nobody ships. Minting a new catalog id must drag the suite along with it.
	 */
	const suite = JSON.parse(
		readFileSync(join(contractDir, 'conformance', 'insight.conformance.json'), 'utf8')
	);
	assert.equal(suite.catalogId, contract.catalogId);
	assert.ok(suite.cases.length > 0, 'a suite with no cases grades nothing');
	for (const c of suite.cases) {
		assert.ok(c.id && c.why, `${c.id ?? '(unnamed)'}: every case states why it exists`);
		assert.ok(c.stream?.length > 0, `${c.id}: a case needs a stream`);
		// Nothing paints without a root, and a surface that never painted
		// satisfies every negative expectation vacuously.
		const declared = c.stream.flatMap((m) => {
			const msg = typeof m === 'string' ? JSON.parse(m) : m;
			return (msg.createSurface?.components ?? msg.updateComponents?.components ?? []).map(
				(x) => x.id
			);
		});
		assert.ok(declared.includes('root'), `${c.id}: stream declares no component with id 'root'`);
	}
});
