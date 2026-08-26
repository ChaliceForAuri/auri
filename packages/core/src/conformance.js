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
 * This module holds the parts every port shares: matching, reporting, and the
 * step/expectation ENGINE. Only the four primitives that are genuinely
 * framework-specific — locate, click, focus, read the container — are injected.
 * Keeping the engine here is what stops three Svelte runners from drifting into
 * three different readings of the same JSON; see each catalog's
 * tests/browser/conformance.test.ts for how thin a runner becomes.
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

/**
 * Execute a case's steps against a rendered surface.
 *
 * `harness` supplies only what a framework must: `locate(spec)` -> an element,
 * `click(el)`, `focus(el)`, `press(el, key)`, `fill(el, value)`, `ingest(msg)`
 * and `settle()`. Everything about what a step MEANS lives here, so a port
 * cannot accidentally redefine it.
 */
export async function runSteps(testCase, harness) {
	for (const step of testCase.steps ?? []) {
		if (step.activate) {
			await harness.click(harness.locate(step.activate));
		} else if (step.focus) {
			harness.focus(harness.locate(step.focus));
		} else if (step.blur) {
			// Several catalogs gate error display on the field having been visited.
			// A port that never blurs will report a form as clean that is not.
			harness.blur(harness.locate(step.blur));
		} else if (step.press) {
			harness.press(step.press.key);
		} else if (step.fill) {
			harness.fill(harness.locate(step.fill), step.fill.value);
		} else if (step.setData) {
			// Agent-side update, not a user action — this is how live behaviour
			// (re-aggregation, gating, drill depth) becomes testable.
			harness.ingest({
				version: 'v1.0',
				updateDataModel: {
					surfaceId: harness.surfaceId,
					path: step.setData.path,
					value: step.setData.value
				}
			});
		}
		await harness.settle();
	}
}

/**
 * Check a case's expectations. Returns an array of human-readable failures —
 * empty means the case passed. Returning rather than throwing keeps the engine
 * free of any test framework's assertion library.
 */
export function checkExpectations(testCase, harness) {
	const expected = testCase.expect ?? {};
	const failures = [];
	const text = harness.text();

	/*
	 * A surface that rendered nothing satisfies every `absent` and `noAction`
	 * expectation there is. That is not a pass, it is a case that never ran —
	 * and it is exactly how a stream with no `root` component (nothing paints)
	 * slips through as green. Demand evidence the surface exists before
	 * believing anything about what it does not contain.
	 */
	if (text.trim().length === 0) {
		failures.push(
			'the surface rendered no text at all — the stream probably declares no component with ' +
				'the id "root", so nothing painted and every negative expectation passed vacuously'
		);
		return failures;
	}

	if (expected.action) {
		const last = harness.actions.at(-1);
		if (!last) {
			failures.push('no action was dispatched');
		} else {
			if (last.name !== expected.action.name) {
				failures.push(`action name was "${last.name}", expected "${expected.action.name}"`);
			}
			const reason = subsetMismatch(last.context, expected.action.context ?? {});
			if (reason) failures.push(reason);
		}
	}
	if (expected.noAction && harness.actions.length > 0) {
		failures.push(`expected no action, got ${harness.actions.map((a) => a.name).join(', ')}`);
	}
	if (expected.text !== undefined && !text.includes(expected.text)) {
		failures.push(`rendered text is missing "${expected.text}"`);
	}
	if (expected.absent !== undefined && text.includes(expected.absent)) {
		failures.push(`rendered text should not contain "${expected.absent}"`);
	}
	if (expected.accessibleName) {
		const { role, contains } = expected.accessibleName;
		const name = harness.accessibleName({ role });
		if (!name.includes(contains)) {
			failures.push(
				`accessible name of role="${role}" is "${name}", expected to contain "${contains}"`
			);
		}
	}
	if (expected.focused) {
		// Focus is a contract, not a detail: a drill stack that loses the element
		// a user came from strands keyboard and screen-reader users mid-task.
		if (!harness.isFocused(expected.focused)) {
			failures.push(
				`expected focus on role="${expected.focused.role}"` +
					(expected.focused.name ? ` named "${expected.focused.name}"` : '') +
					`, but it was elsewhere (${harness.describeFocus()})`
			);
		}
	}
	return failures;
}
