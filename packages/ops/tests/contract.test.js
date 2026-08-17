/**
 * Contract tests: every examples/*.jsonl fixture must validate against
 * contract/catalog.json — the same rule the A2UI spec repo applies to itself.
 * A fixture that drifts from the schema fails CI.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, validateStream } from '../scripts/validate-stream.js';

const examplesDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'contract', 'examples');
const fixtures = readdirSync(examplesDir).filter((name) => name.endsWith('.jsonl'));

const seenAcrossFixtures = new Set();

for (const fixture of fixtures) {
	test(`fixture ${fixture} validates against the contract`, () => {
		const { errors, componentsSeen } = validateStream(
			readFileSync(join(examplesDir, fixture), 'utf8')
		);
		for (const name of componentsSeen) seenAcrossFixtures.add(name);
		assert.deepEqual(errors, []);
	});
}

test('every contract component appears in at least one fixture', () => {
	const missing = Object.keys(catalog.components).filter((name) => !seenAcrossFixtures.has(name));
	assert.deepEqual(missing, [], `components without fixtures: ${missing.join(', ')}`);
});

test('catalog id is the versioned URL and matches $id', () => {
	assert.equal(catalog.catalogId, catalog.$id);
	assert.match(
		catalog.catalogId,
		/^https:\/\/chaliceforauri\.github\.io\/auri\/catalogs\/ops\/v\d+\.json$/
	);
});
