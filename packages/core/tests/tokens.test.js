import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const css = readFileSync(
	join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'tokens.css'),
	'utf8'
);

/**
 * The contract a host relies on: an explicit `.a2ui-light` pin outranks a dark
 * OS *everywhere*, not just in the main dark block. A `prefers-color-scheme:
 * dark` rule that forgets the guard silently overrides the host's own toggle —
 * exactly the failure reported from the first production integration, where a
 * pinned-light page rendered dark hairlines under high contrast.
 */
/**
 * Extract each `@media (prefers-color-scheme: dark)` body by BRACE MATCHING.
 *
 * The obvious regex — a non-greedy body terminated by `\n\t*}` — stops at the
 * end of the block's FIRST rule, not the block. With one rule per block that
 * looks identical, which is why it read as correct; add a second rule and every
 * selector after the first goes unexamined. Verified by adding an unguarded
 * `:where(:root)` as the second rule: the regex version reported zero
 * violations. A regression guard that silently stops guarding is worse than no
 * guard, because the green check is now evidence of nothing.
 */
const SELECTOR = /:where\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*\{/g;

function darkMediaBlocks(source) {
	const bodies = [];
	const open = /@media \(prefers-color-scheme: dark\)\s*\{/g;
	let match;
	while ((match = open.exec(source))) {
		const start = match.index + match[0].length;
		let i = start;
		let depth = 1;
		while (i < source.length && depth > 0) {
			const ch = source[i];
			if (ch === '{') depth++;
			else if (ch === '}') depth--;
			i++;
		}
		bodies.push(source.slice(start, i - 1));
		open.lastIndex = i;
	}
	return bodies;
}

test('every OS-dark rule yields to an explicit light pin', () => {
	const blocks = darkMediaBlocks(css);
	assert.ok(blocks.length > 0, 'expected at least one prefers-color-scheme: dark block');

	for (const body of blocks) {
		const selectors = [...body.matchAll(SELECTOR)].map((m) => m[1]);
		assert.ok(selectors.length > 0, 'expected selectors inside the dark block');
		for (const selector of selectors) {
			assert.ok(
				selector.includes(':not(.a2ui-light)'),
				`OS-dark selector ":where(${selector})" must carry :not(.a2ui-light)`
			);
		}
	}
});

test('dark tokens are reachable by class as well as by OS preference', () => {
	assert.match(css, /:where\(\.a2ui-dark\)\s*\{/);
	assert.match(css, /:where\(:root\),\n:where\(\.a2ui-light\)\s*\{/);
});

test('the OS-dark guard can actually fail', () => {
	/*
	 * The test above passes on today's tokens.css whether or not it works, because
	 * every dark block currently holds exactly one (correct) rule. So prove the
	 * detector fires: inject an unguarded rule as the SECOND rule of the first
	 * dark block — the position the previous regex could not see — and assert it
	 * is found. Without this, the invariant is unfalsifiable.
	 */
	const open = /@media \(prefers-color-scheme: dark\)\s*\{/.exec(css);
	let i = open.index + open[0].length;
	let depth = 1;
	while (i < css.length && depth > 0) {
		const ch = css[i];
		if (ch === '{') depth++;
		else if (ch === '}') depth--;
		i++;
	}
	const sabotaged =
		css.slice(0, i - 1) + '\t:where(:root) {\n\t\t--auri-outline: red;\n\t}\n' + css.slice(i - 1);

	const offenders = darkMediaBlocks(sabotaged)
		.flatMap((body) => [...body.matchAll(SELECTOR)].map((m) => m[1]))
		.filter((selector) => !selector.includes(':not(.a2ui-light)'));

	assert.deepEqual(offenders, [':root'], 'the guard must catch an unguarded rule in any position');
});
