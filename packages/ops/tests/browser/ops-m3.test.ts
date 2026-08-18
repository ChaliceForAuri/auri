import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { ComponentSpec, RendererAction } from 'svelte-a2ui';
import { opsCatalog } from '../../src/lib/index.js';
import { niceCeil, sampleIndices } from '../../src/lib/chart.js';
import { sparklineSummary, formatKeyValue } from '../../src/lib/format.js';

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

function setData(client: A2uiClient, path: string, value: unknown): void {
	client.ingest({ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path, value } });
}

/* -------------------------------------------------------------- pure helpers */

test('chart math: nice ceilings and x-label sampling', () => {
	expect(niceCeil(4.8)).toBe(5);
	expect(niceCeil(0.9)).toBe(1);
	expect(niceCeil(128455)).toBe(200000);
	expect(niceCeil(0)).toBe(1);
	expect(sampleIndices(3)).toEqual([0, 1, 2]);
	const sampled = sampleIndices(24);
	expect(sampled[0]).toBe(0);
	expect(sampled.at(-1)).toBe(23);
	expect(sampled.length).toBeLessThanOrEqual(6);
});

test('sparkline summary and keyvalue formatting (locale-pinned)', () => {
	expect(sparklineSummary([178, 260, 214], 'en-US')).toBe(
		'3 readings, latest 214, range 178 to 260'
	);
	expect(formatKeyValue(128455, 'en-US')).toBe('128,455');
	expect(formatKeyValue('eu-west-1', 'en-US')).toBe('eu-west-1');
	expect(formatKeyValue('2026-08-17T09:12:00Z', 'en-US')).not.toContain('T09:12');
});

/* ---------------------------------------------------------------- Sparkline */

test('Sparkline draws the trend and carries a generated text alternative', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Sparkline',
				label: 'p95 latency',
				values: { path: '/readings' },
				intent: 'warning'
			} as never
		],
		{ readings: [178, 182, 175, 190, 260, 214] }
	);

	await expect
		.poll(() => screen.container.querySelector('.auri-sparkline polyline'))
		.not.toBeNull();
	const svg = screen.container.querySelector('.auri-sparkline svg')!;
	expect(svg.getAttribute('aria-label')).toContain('6 readings, latest 214');
	expect(screen.container.querySelector('.auri-sparkline')!.getAttribute('data-intent')).toBe(
		'warning'
	);
});

/* -------------------------------------------------------------------- Chart */

test('Chart renders series, legend, and restreams when bound values change', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Chart',
				kind: 'line',
				label: 'Error rate by class',
				unit: '%',
				series: [
					{ label: '5xx', values: { path: '/err5' } },
					{ label: '4xx', values: { path: '/err4' } }
				],
				xLabels: { path: '/times' },
				xFormat: 'datetime'
			} as never
		],
		{
			err5: [0.2, 0.3, 1.8, 4.2],
			err4: [1.1, 1.0, 1.2, 1.3],
			times: [
				'2026-08-17T13:00:00Z',
				'2026-08-17T13:15:00Z',
				'2026-08-17T13:30:00Z',
				'2026-08-17T13:45:00Z'
			]
		}
	);

	await expect.poll(() => screen.container.querySelectorAll('polyline.line').length).toBe(2);
	expect(screen.container.querySelectorAll('.legend .key')).toHaveLength(2);

	const before = screen.container.querySelector('polyline.line')!.getAttribute('points');
	setData(client, '/err5', [0.2, 0.3, 1.8, 4.2, 3.1]);
	await expect
		.poll(() => screen.container.querySelector('polyline.line')!.getAttribute('points'))
		.not.toBe(before);
});

test('Chart bar mode draws one rect per point per series', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [
		{
			id: 'root',
			component: 'Chart',
			kind: 'bar',
			label: 'Incidents per day',
			series: [{ label: 'Incidents', values: [2, 0, 5, 1, 3, 0, 1] }],
			xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
		} as never
	]);

	await expect.poll(() => screen.container.querySelectorAll('rect.mark').length).toBe(7);
});

/* ----------------------------------------------------------------- Timeline */

test('Timeline renders events as data and grows through the data model', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	const events = [
		{ title: 'Build 4191 started', time: '2026-08-17T14:20:05Z' },
		{ title: 'Canary healthy', time: '2026-08-17T14:21:40Z', intent: 'good' },
		{ title: 'Rollout began', time: '2026-08-17T14:22:10Z' }
	];

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Timeline',
				label: 'Rollout so far',
				items: { path: '/events' },
				emptyText: 'Nothing yet.'
			} as never
		],
		{ events }
	);

	await expect.element(screen.getByText('Canary healthy')).toBeInTheDocument();
	expect(screen.container.querySelector('li[data-intent="good"]')).not.toBeNull();

	setData(client, '/events', [
		...events,
		{ title: 'Pod 4 probe slow', time: '2026-08-17T14:24:02Z', intent: 'warning' }
	]);
	await expect.element(screen.getByText('Pod 4 probe slow')).toBeInTheDocument();
});

test('Timeline shows the designed empty state', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Timeline',
				items: { path: '/events' },
				emptyText: 'Nothing yet.'
			} as never
		],
		{ events: [] }
	);
	await expect.element(screen.getByText('Nothing yet.')).toBeInTheDocument();
});

/* ----------------------------------------------------------------- Progress */

test('Progress is determinate with a bound value and advances via the data model', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Progress',
				label: 'Rolling out build 4191',
				value: { path: '/ready' },
				max: { path: '/total' }
			} as never
		],
		{ ready: 3, total: 10 }
	);

	const bar = () => screen.container.querySelector('[role="progressbar"]')!;
	await expect.poll(() => bar().getAttribute('aria-valuenow')).toBe('3');
	expect(bar().getAttribute('aria-valuemax')).toBe('10');
	expect(screen.container.textContent).toContain('3 / 10');

	setData(client, '/ready', 7);
	await expect.poll(() => bar().getAttribute('aria-valuenow')).toBe('7');
});

test('Progress with no value prop is indeterminate', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [{ id: 'root', component: 'Progress', label: 'Working…' } as never]);

	await expect.poll(() => screen.container.querySelector('.track.indeterminate')).not.toBeNull();
	expect(
		screen.container.querySelector('[role="progressbar"]')!.getAttribute('aria-valuenow')
	).toBeNull();
});

/* ----------------------------------------------------------------- KeyValue */

test('KeyValue formats values and single facts update live', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'KeyValue',
				label: 'checkout-web',
				items: [
					{ key: 'Region', value: 'eu-west-1' },
					{ key: 'Requests', value: 128455 },
					{ key: 'Error rate', value: { path: '/err' } }
				]
			} as never
		],
		{ err: 0.6 }
	);

	await expect.element(screen.getByText('eu-west-1')).toBeInTheDocument();
	expect(screen.container.textContent).toContain('128,455');
	expect(screen.container.textContent).toContain('0.6');

	setData(client, '/err', 0.4);
	await expect.poll(() => screen.container.textContent).toContain('0.4');
});

/* ---------------------------------------------------------------- CodeBlock */

test('CodeBlock renders verbatim text and streams appended log lines', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'CodeBlock',
				label: 'deploy log',
				language: 'log',
				code: { path: '/log' }
			} as never
		],
		{ log: 'pulling image\nstarting pod 4 of 10' }
	);

	await expect
		.poll(() => screen.container.querySelector('pre code')?.textContent)
		.toContain('starting pod 4');
	expect(screen.container.querySelector('button')).not.toBeNull();

	setData(client, '/log', 'pulling image\nstarting pod 4 of 10\nwaiting on readiness probe');
	await expect
		.poll(() => screen.container.querySelector('pre code')?.textContent)
		.toContain('readiness probe');
});

/* ------------------------------------------------------------ ConfirmButton */

test('ConfirmButton arms on first press, fires on second, disarms on Escape', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [
		{
			id: 'root',
			component: 'ConfirmButton',
			label: 'Abort rollout',
			confirmLabel: 'Really abort?',
			intent: 'bad',
			action: { event: { name: 'rollout_aborted', context: { buildId: 4191 } } }
		} as never
	]);

	await expect.element(screen.getByText('Abort rollout')).toBeInTheDocument();
	const button = screen.container.querySelector('button.auri-confirm') as HTMLButtonElement;

	button.click();
	await expect.poll(() => button.textContent).toContain('Really abort?');
	expect(actions).toHaveLength(0); // armed, not fired

	button.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	await expect.poll(() => button.textContent).toContain('Abort rollout');

	button.click();
	button.click();
	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('rollout_aborted');
	expect(actions[0]!.context.buildId).toBe(4191);
});
