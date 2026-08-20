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

test('contract document is coherent', () => {
	assert.equal(contract.catalogId, contract.$id);
	assert.equal(Object.keys(contract.components).length, 5);
	for (const [name, schema] of Object.entries(contract.components)) {
		const own = schema.allOf?.[1]?.properties ?? {};
		assert.equal(own.component?.const, name, `${name}: component const mismatch`);
	}
});

test('every component requires an accessible name', () => {
	// InsightCard's is its headline; everything else carries label (a11y principle 6).
	for (const [name, schema] of Object.entries(contract.components)) {
		const required = schema.allOf?.[1]?.required ?? [];
		const nameProp =
			name === 'InsightCard' ? 'headline' : name === 'DrillStack' ? 'levels' : 'label';
		assert.ok(required.includes(nameProp), `${name}: ${nameProp} must be required`);
	}
});

test('drillable subjects are structural: subjectKind stays a closed enum', () => {
	assert.deepEqual(contract.$defs.subjectKind.enum, [
		'cluster',
		'account',
		'case',
		'theme',
		'rule'
	]);
	const insight = contract.components.InsightCard.allOf[1];
	assert.ok(insight.required.includes('subjectKind') && insight.required.includes('subjectId'));
});

test('confidence is bounded raw 0..1 — never a string, never a percentage', () => {
	const confidence = contract.components.InsightCard.allOf[1].properties.confidence;
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
