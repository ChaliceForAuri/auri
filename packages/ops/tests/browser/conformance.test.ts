import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { AgentToRenderer, RendererAction } from 'svelte-a2ui';
import { subsetMismatch, loadSuite, surfaceIdOf, explainFailure } from '@aurilabs/core/conformance';
import type { LocatorSpec } from '@aurilabs/core/conformance';
import { opsCatalog } from '../../src/lib/index.js';
import suite from '../../contract/conformance/ops.conformance.json';

/**
 * The REFERENCE conformance runner. The cases in contract/conformance are
 * framework-neutral; this file is the Svelte implementation of them, and it is
 * conformance run #1. A React or Flutter port writes its own ~100 lines of
 * runner against the same JSON — that is the whole point: the port satisfies a
 * specification instead of reverse-engineering Svelte source.
 */

const catalog = createCatalogRegistry([opsCatalog, basicCatalog]);
const cases = loadSuite(suite);

type Screen = Awaited<ReturnType<typeof render>>;
type RoleQuery = {
	getByRole(role: string, options?: unknown): { click(): Promise<void>; element(): Element };
};

/** Address by role + accessible name — the scheme every platform shares. */
function locate(screen: Screen, spec: LocatorSpec) {
	const options = spec.name ? { name: new RegExp(spec.name, 'i') } : undefined;
	return (screen as unknown as RoleQuery).getByRole(spec.role, options);
}

test.each(cases.map((c) => [c.id, c] as const))('conformance: %s', async (_id, testCase) => {
	const actions: RendererAction[] = [];
	const client = new A2uiClient({ onAction: (action) => actions.push(action) });
	const surfaceId = surfaceIdOf(testCase.messages);
	expect(surfaceId, `${testCase.id}: stream creates no surface`).toBeTruthy();

	const screen = await render(Surface, { props: { client, catalog, surfaceId: surfaceId! } });
	for (const message of testCase.messages) client.ingest(message as unknown as AgentToRenderer);
	await new Promise((r) => setTimeout(r, 120));

	for (const step of testCase.steps ?? []) {
		if (step.activate) {
			await locate(screen, step.activate).click();
		} else if (step.focus) {
			(locate(screen, step.focus).element() as HTMLElement).focus();
		} else if (step.press) {
			const target = (document.activeElement ?? screen.container) as HTMLElement;
			target.dispatchEvent(new KeyboardEvent('keydown', { key: step.press.key, bubbles: true }));
		} else if (step.fill) {
			const input = locate(screen, step.fill).element() as HTMLInputElement;
			input.value = step.fill.value;
			input.dispatchEvent(new Event('input', { bubbles: true }));
		} else if (step.setData) {
			// Agent-side update, not a user action — this is how live behaviour
			// (re-aggregation, gating, drill depth) becomes testable.
			client.ingest({
				version: 'v1.0',
				updateDataModel: {
					surfaceId: surfaceId!,
					path: step.setData.path,
					value: step.setData.value
				}
			} as unknown as AgentToRenderer);
		}
		await new Promise((r) => setTimeout(r, 80));
	}

	const expected = testCase.expect ?? {};
	const container = screen.container as HTMLElement;

	if (expected.action) {
		const last = actions.at(-1);
		expect(last, explainFailure(testCase, 'no action was dispatched')).toBeTruthy();
		expect(last!.name, explainFailure(testCase, `action name was "${last!.name}"`)).toBe(
			expected.action.name
		);
		const reason = subsetMismatch(last!.context, expected.action.context ?? {});
		expect(reason, reason ? explainFailure(testCase, reason) : undefined).toBeNull();
	}
	if (expected.noAction) {
		expect(
			actions,
			explainFailure(testCase, `expected no action, got ${actions.map((a) => a.name).join(', ')}`)
		).toEqual([]);
	}
	if (expected.text) {
		expect(
			container.textContent,
			explainFailure(testCase, `rendered text is missing "${expected.text}"`)
		).toContain(expected.text);
	}
	if (expected.absent) {
		expect(
			container.textContent,
			explainFailure(testCase, `rendered text should not contain "${expected.absent}"`)
		).not.toContain(expected.absent);
	}
	if (expected.accessibleName) {
		const { role, contains } = expected.accessibleName;
		const el = locate(screen, { role }).element() as HTMLElement;
		const name = el.getAttribute('aria-label') ?? el.textContent ?? '';
		expect(
			name,
			explainFailure(testCase, `accessible name of role="${role}" is "${name}"`)
		).toContain(contains);
	}
});
