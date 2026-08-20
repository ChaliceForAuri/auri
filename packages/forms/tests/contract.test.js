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
	assert.equal(Object.keys(contract.components).length, 10);
	for (const [name, schema] of Object.entries(contract.components)) {
		const own = schema.allOf?.[1]?.properties ?? {};
		assert.equal(own.component?.const, name, `${name}: component const mismatch`);
	}
});

test('every field requires an accessible name and a value binding', () => {
	const sections = new Set(['FormSection', 'SubmitBar']);
	for (const [name, schema] of Object.entries(contract.components)) {
		if (sections.has(name)) continue;
		const required = schema.allOf?.[1]?.required ?? [];
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

test('checks stay on the five renderer built-ins', () => {
	assert.deepEqual(contract.$defs.checkRule.properties.call.enum, [
		'required',
		'email',
		'regex',
		'length',
		'numeric'
	]);
});
