/**
 * Catalog conformance — the shared, framework-neutral half.
 *
 * A contract says which props exist. It cannot say what a renderer must DO
 * with them, and auri's catalogs do a great deal: nine action props are
 * registered `raw` purely so a component can merge context before dispatch,
 * fields inject their bound value into checks, submit gates on surface-wide
 * validity, footers aggregate client-side, drill stacks restore focus by
 * element identity. Until now all of that lived in prose, comments and
 * Svelte-specific tests — so a React or Flutter port could only learn it by
 * reading Svelte, which is how ecosystems end up with three renderers that
 * all claim ops v1 and quietly disagree.
 *
 * A conformance suite is JSON that any renderer can execute: a stream to
 * ingest, steps to perform, and outcomes to assert. Elements are addressed by
 * ROLE AND ACCESSIBLE NAME — the one addressing scheme the web, Flutter and
 * Compose genuinely share — which has a useful side effect: a case is only
 * executable if the UI is actually accessible.
 *
 * This module holds the parts every port shares (matching and reporting). The
 * runner itself is necessarily per-framework; see each catalog's
 * tests/browser/conformance.test.ts for the reference Svelte implementation.
 */

/**
 * Deep subset match: every key in `expected` must be present in `actual` and
 * equal. Extra keys in `actual` are allowed — a port may carry additional
 * context, it may not omit what the contract promises.
 *
 * @returns {string | null} null when it matches, else a human-readable reason
 */
export function subsetMismatch(actual, expected, path = 'context') {
	if (expected === null || typeof expected !== 'object') {
		return Object.is(actual, expected)
			? null
			: `${path}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
	}
	if (Array.isArray(expected)) {
		if (!Array.isArray(actual)) return `${path}: expected an array, got ${JSON.stringify(actual)}`;
		if (actual.length !== expected.length) {
			return `${path}: expected ${expected.length} items, got ${actual.length}`;
		}
		for (let i = 0; i < expected.length; i++) {
			const reason = subsetMismatch(actual[i], expected[i], `${path}[${i}]`);
			if (reason) return reason;
		}
		return null;
	}
	if (actual === null || typeof actual !== 'object') {
		return `${path}: expected an object, got ${JSON.stringify(actual)}`;
	}
	for (const [key, value] of Object.entries(expected)) {
		if (!(key in actual)) return `${path}.${key}: missing`;
		const reason = subsetMismatch(actual[key], value, `${path}.${key}`);
		if (reason) return reason;
	}
	return null;
}

/** Every case in a suite, with its stream parsed. */
export function loadSuite(suite) {
	return (suite.cases ?? []).map((testCase) => ({
		...testCase,
		messages: testCase.stream.map((line) => (typeof line === 'string' ? JSON.parse(line) : line))
	}));
}

/** The surface a case's stream creates — cases never hardcode it twice. */
export function surfaceIdOf(messages) {
	return messages.find((m) => m.createSurface)?.createSurface?.surfaceId;
}

/**
 * A failure message worth reading at 2am in someone else's port: what broke,
 * and the contract sentence that says why it matters.
 */
export function explainFailure(testCase, reason) {
	return `conformance case "${testCase.id}" failed\n  ${reason}\n  why this case exists: ${testCase.why}`;
}
