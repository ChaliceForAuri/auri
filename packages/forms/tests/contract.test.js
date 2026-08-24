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
 * Silent fallbacks are why these assertions passed vacuously against the first
 * compiled contract while asserting nothing at all.
 */
function own(name, schema) {
	assert.ok(schema.properties, `${name}: compiled component has no properties`);
	assert.ok(!schema.allOf, `${name}: compiled component must not carry allOf (rule 5)`);
	return { properties: schema.properties, required: schema.required ?? [] };
}

test('contract document is coherent', () => {
	assert.equal(contract.catalogId, contract.$id);
	assert.equal(Object.keys(contract.components).length, 10);
	for (const [name, schema] of Object.entries(contract.components)) {
		const { properties } = own(name, schema);
		assert.equal(properties.component?.const, name, `${name}: component const mismatch`);
	}
});

test('every field requires an accessible name and a value binding', () => {
	const sections = new Set(['FormSection', 'SubmitBar']);
	for (const [name, schema] of Object.entries(contract.components)) {
		if (sections.has(name)) continue;
		const { required } = own(name, schema);
		assert.ok(required.includes('label'), `${name}: label must be required (a11y principle 6)`);
		assert.ok(required.includes('value'), `${name}: value binding must be required`);
	}
});

test('every fixture replays clean through the contract validator', () => {
	const examples = join(contractDir, 'examples');
	const files = readdirSync(examples).filter((f) => f.endsWith('.jsonl'));
	assert.equal(files.length, 10, 'one fixture per component');
	for (const file of files) {
		const { errors } = validateStream(readFileSync(join(examples, file), 'utf8'));
		assert.deepEqual(errors, [], `${file} should validate`);
	}
});

test('fixtures collectively exercise all 10 components', () => {
	const examples = join(contractDir, 'examples');
	const seen = new Set();
	for (const file of readdirSync(examples).filter((f) => f.endsWith('.jsonl'))) {
		const { componentsSeen } = validateStream(readFileSync(join(examples, file), 'utf8'));
		for (const c of componentsSeen) seen.add(c);
	}
	assert.deepEqual([...seen].sort(), Object.keys(contract.components).sort());
});

test('checks stay on the five renderer built-ins, in the spec-shaped wrapper', () => {
	// Our checkRule is the spec's CheckRule NARROWED: `condition` is a FunctionCall,
	// `call` is closed to the built-ins, and `message` is required. Read it off a
	// shipped component, since the compiler inlines catalog-local helpers (rule 2).
	const rule = contract.components.TextField.properties.checks.items;
	assert.deepEqual(rule.required, ['condition', 'message']);
	assert.deepEqual(rule.properties.condition.properties.call.enum, [
		'required',
		'email',
		'regex',
		'length',
		'numeric'
	]);
});
