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
test('every OS-dark rule yields to an explicit light pin', () => {
	const blocks = [
		...css.matchAll(/@media \(prefers-color-scheme: dark\)\s*\{([\s\S]*?)\n\t*\}\n/g)
	];
	assert.ok(blocks.length > 0, 'expected at least one prefers-color-scheme: dark block');

	for (const [, body] of blocks) {
		const selectors = [...body.matchAll(/:where\(([^)]*(?:\([^)]*\))?[^)]*)\)\s*\{/g)].map(
			(m) => m[1]
		);
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
