/// <reference types="vite/client" />

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import axe from 'axe-core';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { AgentToRenderer } from 'svelte-a2ui';
import { insightCatalog } from '../../src/lib/index.js';
import { opsCatalog } from '../../../ops/src/lib/index.js';

/**
 * A11y enforced at the RENDERED layer, not just the schema layer.
 *
 * The contract already makes an inaccessible emission inexpressible — labels
 * and accessible names are required props. That guarantees the agent supplies
 * the information; it cannot guarantee the component spends it correctly. This
 * suite replays every shipped fixture through a real client and audits the DOM
 * axe sees, which is what a screen reader sees.
 *
 * Page-level rules are disabled deliberately: a catalog renders a FRAGMENT into
 * a host document, so landmarks, a single h1, and <html lang> are the host's
 * responsibility and would be false failures here.
 */
const PAGE_LEVEL_RULES = [
	'region',
	'landmark-one-main',
	'page-has-heading-one',
	'html-has-lang',
	'bypass'
];

const catalog = createCatalogRegistry([insightCatalog, opsCatalog, basicCatalog]);

const fixtures = import.meta.glob('../../contract/examples/*.jsonl', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

async function auditFixture(name: string, jsonl: string): Promise<void> {
	const messages = jsonl
		.split('\n')
		.filter((l) => l.trim())
		.map((l) => JSON.parse(l) as AgentToRenderer);
	// The fixture names its own surface — hardcoding one renders NOTHING and
	// makes this suite pass vacuously, which it briefly did.
	const surfaceId = messages.find((m) => m.createSurface)?.createSurface?.surfaceId;
	expect(surfaceId, `${name} declares no surface`).toBeTruthy();

	const client = new A2uiClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: surfaceId! } });
	for (const message of messages) client.ingest(message);
	// Let the entrance animation settle: axe reads computed style, and a
	// mid-fade element can read as insufficient contrast.
	await new Promise((resolve) => setTimeout(resolve, 350));

	const container = screen.container as HTMLElement;
	// Proof the audit had something to audit.
	expect(
		container.textContent?.trim().length ?? 0,
		`${name} rendered nothing — the audit would pass vacuously`
	).toBeGreaterThan(0);

	const results = await axe.run(container, {
		runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] },
		rules: Object.fromEntries(PAGE_LEVEL_RULES.map((id) => [id, { enabled: false }]))
	});

	const detail = results.violations
		.map(
			(v) =>
				`${v.id} (${v.impact}): ${v.help}\n      ${v.nodes.map((n) => n.html.slice(0, 120)).join('\n      ')}`
		)
		.join('\n  ');
	expect(results.violations, `${name} has a11y violations:\n  ${detail}`).toEqual([]);
}

test('every insight fixture renders without axe violations', async () => {
	const files = Object.keys(fixtures);
	expect(files.length).toBeGreaterThan(0);
	for (const file of files) {
		const name = file.split('/').pop()!;
		await auditFixture(name, fixtures[file]!);
	}
}, 60_000);
