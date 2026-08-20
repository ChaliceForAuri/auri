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

test('defs are pruned transitively: kept when referenced, dropped when not', () => {
	const composed = composeContract({ contract, components: ['CodeBlock'] });
	const defs = Object.keys(composed.$defs);
	// CodeBlock -> componentCommon + dynamicString -> pathRef/functionRef
	for (const kept of ['componentCommon', 'dynamicString', 'pathRef', 'functionRef']) {
		assert.ok(defs.includes(kept), `${kept} should survive`);
	}
	for (const dropped of ['series', 'column', 'timelineItem', 'kvItem']) {
		assert.ok(!defs.includes(dropped), `${dropped} should be pruned`);
	}
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
	assert.equal(Object.keys(c.$defs).length, Object.keys(contract.$defs).length);
	for (const name of all) assert.match(p, new RegExp(`### ${name} — `));
});
