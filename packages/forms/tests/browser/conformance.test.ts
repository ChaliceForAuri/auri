import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { AgentToRenderer, RendererAction } from 'svelte-a2ui';
import {
	loadSuite,
	surfaceIdOf,
	runSteps,
	checkExpectations,
	explainFailure
} from '@aurilabs/core/conformance';
import { createHarness } from '../../../../tests/support/conformance-harness.js';
import { formsCatalog } from '../../src/lib/index.js';
import suite from '../../contract/conformance/forms.conformance.json';

/**
 * Conformance run for this catalog. The cases in contract/conformance are
 * framework-neutral and the step/expectation engine is shared, so all this file
 * does is render a Svelte surface and hand the engine a harness — which is the
 * point: a port satisfies a specification instead of reverse-engineering Svelte.
 */
const catalog = createCatalogRegistry([formsCatalog, basicCatalog]);
const cases = loadSuite(suite);

test.each(cases.map((c) => [c.id, c] as const))('conformance: %s', async (_id, testCase) => {
	const actions: RendererAction[] = [];
	const client = new A2uiClient({ onAction: (action) => actions.push(action) });
	const surfaceId = surfaceIdOf(testCase.messages);
	expect(surfaceId, `${testCase.id}: stream creates no surface`).toBeTruthy();

	const screen = await render(Surface, { props: { client, catalog, surfaceId: surfaceId! } });
	for (const message of testCase.messages) client.ingest(message as unknown as AgentToRenderer);
	await new Promise((r) => setTimeout(r, 120));

	const harness = createHarness(screen as never, client, surfaceId!, actions);
	await runSteps(testCase, harness);

	const failures = checkExpectations(testCase, harness);
	expect(failures, failures.map((f) => explainFailure(testCase, f)).join('\n')).toEqual([]);
});
