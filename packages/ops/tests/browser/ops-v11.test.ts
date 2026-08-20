import { expect, test, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { ComponentSpec, RendererAction } from 'svelte-a2ui';
import { opsCatalog } from '../../src/lib/index.js';

/* Issues #18 and #19 — the first consumer's additive v1 extensions:
   Chart pointAction + markers, DataTable footer aggregates. */

const SURFACE = 'test';
const catalog = createCatalogRegistry([opsCatalog, basicCatalog]);

function makeClient(onAction?: (action: RendererAction) => void): A2uiClient {
	return new A2uiClient(onAction ? { onAction } : {});
}

function boot(
	client: A2uiClient,
	components: ComponentSpec[],
	dataModel: Record<string, unknown> = {}
): void {
	client.ingest({
		version: 'v1.0',
		createSurface: { surfaceId: SURFACE, catalogId: opsCatalog.id, components, dataModel }
	});
}

const LEDGER_ROWS = [
	{ company: 'Acme Corp', tier: 'Enterprise', arr: 480000 },
	{ company: 'Globex', tier: 'Enterprise', arr: 350000 },
	{ company: 'Initech', tier: 'Growth', arr: 210000 },
	{ company: 'Umbrella', tier: 'Growth', arr: 160000 }
];

const LEDGER_TABLE = {
	id: 'root',
	component: 'DataTable',
	label: 'Impact ledger',
	columns: [
		{ key: 'company', label: 'Company' },
		{ key: 'tier', label: 'Tier' },
		{ key: 'arr', label: 'ARR', align: 'end', format: 'number' }
	],
	rows: { path: '/accounts' },
	footer: [{ key: 'arr', aggregate: 'sum', label: 'Total ARR at risk' }]
};

test('DataTable footer sums client-side and re-totals on data updates', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [LEDGER_TABLE as never], { accounts: LEDGER_ROWS });

	await expect.element(screen.getByText('Total ARR at risk')).toBeInTheDocument();
	const foot = screen.container.querySelector('tfoot') as HTMLElement;
	expect(foot.textContent).toContain('1,200,000');

	// Filter the rows; the total follows — the whole point of client-side aggregates.
	client.ingest({
		version: 'v1.0',
		updateDataModel: { surfaceId: SURFACE, path: '/accounts', value: LEDGER_ROWS.slice(0, 2) }
	});
	await expect.poll(() => foot.textContent).toContain('830,000');
});

test('DataTable footer shows a skeleton while rows load — never 0', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [LEDGER_TABLE as never], {}); // /accounts unresolved

	await expect.element(screen.getByText('Impact ledger')).toBeInTheDocument();
	const foot = screen.container.querySelector('tfoot') as HTMLElement;
	expect(foot.querySelector('.auri-skeleton')).not.toBeNull();
	expect(foot.textContent).not.toContain('0');
});

const SENTIMENT_CHART = {
	id: 'root',
	component: 'Chart',
	kind: 'line',
	label: 'Daily sentiment',
	series: [{ label: 'Avg sentiment', values: { path: '/daily' } }],
	xLabels: { path: '/days' },
	markers: [
		{ pointIndex: 3, intent: 'bad', label: 'Sentiment fell 22%' },
		{ pointIndex: 99, label: 'out of range, must drop' }
	],
	pointAction: { event: { name: 'day_drilled', context: { clusterId: 'cl-report-accuracy' } } }
};
const SENTIMENT_DATA = {
	daily: [62, 64, 41, 47, 55],
	days: ['Aug 10', 'Aug 11', 'Aug 12', 'Aug 13', 'Aug 14']
};

test('Chart markers render labelled and intent-coloured; out-of-range drops', async () => {
	const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [SENTIMENT_CHART as never], SENTIMENT_DATA);

	await expect.element(screen.getByText('Daily sentiment')).toBeInTheDocument();
	const guides = screen.container.querySelectorAll('.marker-guide');
	expect(guides).toHaveLength(1); // the out-of-range marker was dropped
	expect(warn).toHaveBeenCalledWith(expect.stringContaining('out of range'));

	// The marker joins the generated text alternative (a11y requirement from #18).
	const figure = screen.container.querySelector('figure.auri-chart') as HTMLElement;
	expect(figure.getAttribute('aria-label')).toContain('Sentiment fell 22%');
	warn.mockRestore();
});

test('Chart pointAction: click merges point context; keyboard traverses and fires', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [SENTIMENT_CHART as never], SENTIMENT_DATA);

	await expect.element(screen.getByText('Daily sentiment')).toBeInTheDocument();
	const hits = screen.container.querySelectorAll('circle.hit');
	expect(hits).toHaveLength(5);

	(hits[2] as SVGCircleElement).dispatchEvent(new MouseEvent('click', { bubbles: true }));
	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('day_drilled');
	expect(actions[0]!.context.clusterId).toBe('cl-report-accuracy');
	expect(actions[0]!.context.pointIndex).toBe(2);
	expect(actions[0]!.context.xLabel).toBe('Aug 12');
	expect(actions[0]!.context.value).toBe(41);
	expect(actions[0]!.context.seriesLabel).toBe('Avg sentiment');

	// One tab stop, arrows traverse, Enter fires (a11y contract from #18).
	const svg = screen.container.querySelector('svg[tabindex="0"]') as SVGSVGElement;
	expect(svg).not.toBeNull();
	svg.dispatchEvent(new FocusEvent('focus'));
	svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
	svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	await expect.poll(() => actions.length).toBe(2);
	expect(actions[1]!.context.pointIndex).toBe(1);
});
