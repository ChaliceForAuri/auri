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

test('workspace lockstep: every catalog version and range agrees with core', () => {
	// A drifted range makes npm nest a stale registry copy of core under a
	// catalog, which silently shadows the workspace tokens at build (v0.2.0 bug).
	const here = dirname(fileURLToPath(import.meta.url));
	const core = JSON.parse(readFileSync(join(here, '..', '..', 'core', 'package.json'), 'utf8'));
	for (const key of ['ops', 'forms', 'insight']) {
		const pkg = JSON.parse(readFileSync(join(here, '..', '..', key, 'package.json'), 'utf8'));
		assert.equal(core.version, pkg.version, `core and ${key} must version in lockstep`);
		assert.equal(
			pkg.dependencies['@aurilabs/core'],
			`^${core.version}`,
			`${key} dependency range must be bumped with every lockstep version bump`
		);
	}
});
