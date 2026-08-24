import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { composeCatalog, composeContract, composePrompt } from '../src/compose.js';

// Composition is tested against the real ops artifacts — the same files the
// composer page serves — so the parser can't drift from the pack's structure.
const opsContract = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'ops', 'contract');
const contract = JSON.parse(readFileSync(join(opsContract, 'catalog.json'), 'utf8'));
const prompt = readFileSync(join(opsContract, 'prompt.md'), 'utf8');
const fixtures = Object.fromEntries(
	readdirSync(join(opsContract, 'examples'))
		.filter((f) => f.endsWith('.jsonl'))
		.map((f) => [
			// stat.jsonl -> Stat, approval-card.jsonl -> ApprovalCard
			basename(f, '.jsonl')
				.split('-')
				.map((p) => p[0].toUpperCase() + p.slice(1))
				.join(''),
			readFileSync(join(opsContract, 'examples', f), 'utf8')
		])
);

test('contract subset keeps chosen components and prunes the rest', () => {
	const composed = composeContract({ contract, components: ['Stat', 'Callout'] });
	assert.deepEqual(Object.keys(composed.components), ['Stat', 'Callout']);
	assert.equal(composed.catalogId, contract.catalogId);
});

test('composition regenerates the two required $defs over its own subset', () => {
	const composed = composeContract({ contract, components: ['CodeBlock', 'Stat'] });
	// Rule 2 leaves exactly two $defs, and rule 1 requires both.
	assert.deepEqual(Object.keys(composed.$defs).sort(), ['anyComponent', 'anyFunction']);
	// The union names the subset — never the source's full component list, which
	// would leave $refs pointing at components the document no longer contains.
	assert.deepEqual(
		composed.$defs.anyComponent.oneOf.map((b) => b.$ref),
		['#/components/CodeBlock', '#/components/Stat']
	);
	assert.equal(composed.$defs.anyComponent.discriminator.propertyName, 'component');
});

test('minted id names the document; catalogId stays the source', () => {
	const id = 'https://example.com/catalogs/mine/v1.json';
	const composed = composeContract({ contract, components: ['Stat'], id, title: 'mine' });
	assert.equal(composed.$id, id);
	assert.equal(composed.title, 'mine');
	assert.equal(composed.catalogId, contract.catalogId);
});

test('prompt keeps global sections, cuts unchosen components', () => {
	const composed = composePrompt({ prompt, components: ['Stat', 'ApprovalCard'] });
	assert.match(composed, /## The wire in 30 seconds/);
	assert.match(composed, /## Rules/);
	assert.match(composed, /## Mixing with the basic catalog/);
	assert.match(composed, /### Stat — /);
	assert.match(composed, /### ApprovalCard — /);
	assert.doesNotMatch(composed, /### Badge — /);
	assert.doesNotMatch(composed, /### Chart — /);
	assert.doesNotMatch(composed, /## A complete example/);
});

test('prompt embeds chosen fixtures as examples', () => {
	const composed = composePrompt({ prompt, components: ['Stat'], fixtures });
	assert.match(composed, /## Examples/);
	assert.match(composed, /One Stat stream:/);
	assert.doesNotMatch(composed, /One Badge stream:/);
});

test('composeCatalog reports missing names and keeps source order', () => {
	const {
		chosen,
		missing,
		contract: c,
		fixtures: f
	} = composeCatalog({
		contract,
		prompt,
		fixtures,
		components: ['Callout', 'Stat', 'NotAComponent']
	});
	// Source order, not request order — deterministic artifacts.
	assert.deepEqual(chosen, ['Stat', 'Callout']);
	assert.deepEqual(missing, ['NotAComponent']);
	assert.deepEqual(Object.keys(c.components), ['Stat', 'Callout']);
	assert.deepEqual(Object.keys(f).sort(), ['Callout', 'Stat']);
});

test('the full composition round-trips all 12 components', () => {
	const all = Object.keys(contract.components);
	const { contract: c, prompt: p } = composeCatalog({ contract, prompt, components: all });
	assert.equal(Object.keys(c.components).length, 12);
	assert.deepEqual(Object.keys(c.$defs).sort(), ['anyComponent', 'anyFunction']);
	assert.equal(c.$defs.anyComponent.oneOf.length, 12);
	for (const name of all) assert.match(p, new RegExp(`### ${name} — `));
});

/* ------------------------------------------------------------------ mixing */

import { composeMixed } from '../src/compose.js';

const formsContractDir = join(
	dirname(fileURLToPath(import.meta.url)),
	'..',
	'..',
	'forms',
	'contract'
);
const formsContract = JSON.parse(readFileSync(join(formsContractDir, 'catalog.json'), 'utf8'));
const formsPrompt = readFileSync(join(formsContractDir, 'prompt.md'), 'utf8');
const formsFixtures = Object.fromEntries(
	readdirSync(join(formsContractDir, 'examples'))
		.filter((f) => f.endsWith('.jsonl'))
		.map((f) => [
			basename(f, '.jsonl')
				.split('-')
				.map((p) => p[0].toUpperCase() + p.slice(1))
				.join(''),
			readFileSync(join(formsContractDir, 'examples', f), 'utf8')
		])
);

const SOURCES = [
	{ key: 'ops', contract, prompt, fixtures },
	{ key: 'forms', contract: formsContract, prompt: formsPrompt, fixtures: formsFixtures }
];

test('mixed composition: primary structure, secondary rides the mixing rule', () => {
	const mixed = composeMixed({ sources: SOURCES, components: ['Stat', 'TextField'] });
	assert.equal(mixed.primary, 'ops');
	assert.deepEqual(
		mixed.contracts.map((c) => c.key),
		['ops', 'forms']
	);
	assert.deepEqual(Object.keys(mixed.contracts[0].contract.components), ['Stat']);
	assert.deepEqual(Object.keys(mixed.contracts[1].contract.components), ['TextField']);
	// Primary pack structure once; secondary sections labeled and scoped.
	assert.match(mixed.prompt, /## The forms catalog — mixed onto this surface/);
	assert.match(mixed.prompt, /### Rules for forms components/);
	assert.match(mixed.prompt, /### TextField — /);
	assert.doesNotMatch(mixed.prompt, /### Badge — /);
	assert.doesNotMatch(mixed.prompt, /### TextArea — /);
});

test('mixed examples remap the secondary fixture onto the primary surface', () => {
	const mixed = composeMixed({ sources: SOURCES, components: ['Stat', 'TextField'] });
	const example = mixed.prompt.slice(mixed.prompt.indexOf('One mixed TextField stream'));
	const lines = example
		.split('\n')
		.filter((l) => l.startsWith('{'))
		.map((l) => JSON.parse(l));
	const create = lines.find((m) => m.createSurface);
	assert.equal(create.createSurface.catalogId, contract.catalogId);
	const specs = lines.flatMap((m) => m.updateComponents?.components ?? []);
	const field = specs.find((s) => s.component === 'TextField');
	assert.equal(field.catalogId, formsContract.catalogId);
	// The basic-catalog root keeps its own explicit id, untouched.
	const root = specs.find((s) => s.id === 'root');
	assert.match(root.catalogId, /basic/);
});

test('single-source picks degrade to the plain composition', () => {
	const mixed = composeMixed({ sources: SOURCES, components: ['TextField', 'SubmitBar'] });
	assert.equal(mixed.primary, 'forms');
	assert.equal(mixed.contracts.length, 1);
	assert.match(mixed.prompt, /## Examples/);
	assert.doesNotMatch(mixed.prompt, /mixed onto this surface/);
});

test('mixed reports unknown names and preserves per-source order', () => {
	const mixed = composeMixed({ sources: SOURCES, components: ['Toggle', 'Stat', 'Nope'] });
	assert.deepEqual(mixed.chosen, ['Stat', 'Toggle']);
	assert.deepEqual(mixed.missing, ['Nope']);
});
