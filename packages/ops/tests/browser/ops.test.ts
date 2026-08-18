import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { ComponentSpec, RendererAction } from 'svelte-a2ui';
import { opsCatalog } from '../../src/lib/index.js';
import { formatStatValue, formatDelta } from '../../src/lib/format.js';

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

/* ------------------------------------------------------------------- format */

test('formatStatValue formats currency codes and plain units (locale-pinned)', () => {
	expect(formatStatValue(12400, 'USD', 'en-US')).toEqual({ text: '$12,400.00', unitText: null });
	expect(formatStatValue(0.8, '%', 'en-US')).toEqual({ text: '0.8', unitText: '%' });
	expect(formatStatValue('Healthy', undefined, 'en-US')).toEqual({
		text: 'Healthy',
		unitText: null
	});
	expect(formatDelta(1200, 'USD', 'en-US')).toBe('+$1,200.00');
	expect(formatDelta(-38, 'ms', 'en-US')).toBe('-38 ms');
});

/* --------------------------------------------------------------------- Stat */

test('Stat shows a skeleton until its binding resolves, then the formatted value', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [
		{
			id: 'root',
			component: 'Stat',
			label: 'p95 latency',
			value: { path: '/p95' },
			unit: 'ms',
			delta: -38,
			trend: 'down',
			intent: 'good',
			caption: 'vs previous hour'
		} as never
	]);

	// Data hasn't arrived: the value line is a shimmer reserving its exact box.
	await expect
		.poll(() => screen.container.querySelector('.auri-stat .auri-skeleton'))
		.not.toBeNull();

	setData(client, '/p95', 342);
	await expect
		.poll(() => screen.container.querySelector('.auri-stat .value')?.textContent)
		.toContain('342');

	const stat = screen.container.querySelector('.auri-stat')!;
	expect(stat.getAttribute('data-intent')).toBe('good');
	expect(stat.textContent).toContain('38 ms'); // formatted delta
	expect(stat.textContent).toContain('vs previous hour');
	expect(stat.querySelector('.auri-skeleton')).toBeNull();
});

/* -------------------------------------------------------------------- Badge */

test('Badge text and intent flip through the data model without a component re-send', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'Badge',
				text: { path: '/stage' },
				intent: { path: '/stageIntent' }
			} as never
		],
		{ stage: 'Canary', stageIntent: 'warning' }
	);

	await expect.element(screen.getByText('Canary')).toBeInTheDocument();
	expect(screen.container.querySelector('.auri-badge')!.getAttribute('data-intent')).toBe(
		'warning'
	);

	setData(client, '/stage', 'Live');
	setData(client, '/stageIntent', 'good');

	await expect.element(screen.getByText('Live')).toBeInTheDocument();
	expect(screen.container.querySelector('.auri-badge')!.getAttribute('data-intent')).toBe('good');
});

/* ------------------------------------------------------------------ Callout */

test('Callout renders inline markdown, resting intent info', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [
		{
			id: 'root',
			component: 'Callout',
			title: 'Deploy window tonight',
			text: 'Payments API deploys **tonight**. Expect brief latency.'
		} as never
	]);

	await expect.element(screen.getByText('Deploy window tonight')).toBeInTheDocument();
	const callout = screen.container.querySelector('.auri-callout')!;
	expect(callout.getAttribute('data-intent')).toBe('info');
	expect(callout.getAttribute('role')).toBe('note');
	expect(callout.querySelector('strong')?.textContent).toBe('tonight');
});

/* ---------------------------------------------------------------- DataTable */

const DEPLOY_ROWS = [
	{ service: 'payments-api', status: 'Live', durationSec: 142 },
	{ service: 'checkout-web', status: 'Canary', durationSec: 98 },
	{ service: 'search-index', status: 'Failed', durationSec: 311 }
];

const TABLE_SPEC = {
	id: 'root',
	component: 'DataTable',
	label: "Today's deploys",
	columns: [
		{ key: 'service', label: 'Service' },
		{ key: 'status', label: 'Status' },
		{ key: 'durationSec', label: 'Duration', align: 'end', format: 'number', sortable: true }
	],
	rows: { path: '/deploys' },
	emptyText: 'No deploys yet today.',
	rowAction: { event: { name: 'view_deploy', context: { env: 'production' } } }
} as never;

function firstColumnTexts(container: Element): string[] {
	return [...container.querySelectorAll('tbody tr td:first-child')].map(
		(td) => td.textContent ?? ''
	);
}

test('DataTable renders bound rows, updates a single cell, and sorts locally', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [TABLE_SPEC], { deploys: DEPLOY_ROWS });

	await expect.element(screen.getByText('payments-api')).toBeInTheDocument();

	// Single-cell update through the data model.
	setData(client, '/deploys/1/status', 'Live');
	await expect.poll(() => screen.container.textContent).not.toContain('Canary');

	// Client-side sort on the sortable column: ascending by duration.
	(screen.container.querySelector('th button.sort') as HTMLButtonElement).click();
	await expect.poll(() => firstColumnTexts(screen.container)[0]).toBe('checkout-web');
	expect(firstColumnTexts(screen.container)).toEqual([
		'checkout-web',
		'payments-api',
		'search-index'
	]);
});

test('DataTable row activation dispatches the rowAction with row + rowIndex context', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [TABLE_SPEC], { deploys: DEPLOY_ROWS });
	await expect.element(screen.getByText('payments-api')).toBeInTheDocument();

	(screen.container.querySelector('tbody tr') as HTMLElement).click();

	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('view_deploy');
	expect(actions[0]!.sourceComponentId).toBe('root');
	expect(actions[0]!.context.env).toBe('production');
	expect(actions[0]!.context.rowIndex).toBe(0);
	expect((actions[0]!.context.row as { service: string }).service).toBe('payments-api');
});

test('DataTable shows the designed empty state when rows resolve to []', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(client, [TABLE_SPEC], { deploys: [] });
	await expect.element(screen.getByText('No deploys yet today.')).toBeInTheDocument();
});

/* ------------------------------------------------------------- ApprovalCard */

test('ApprovalCard gates on the required comment and carries it in the action context', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });

	boot(
		client,
		[
			{
				id: 'root',
				component: 'ApprovalCard',
				title: 'Roll back payments-api?',
				summary: 'Error rate hit **4.2%** after deploy 4190.',
				requireComment: true,
				approveAction: {
					event: { name: 'rollback_approved', context: { deployId: { path: '/deployId' } } }
				},
				rejectAction: { event: { name: 'rollback_rejected' } }
			} as never
		],
		{ deployId: 'deploy-4190' }
	);

	await expect.element(screen.getByText('Roll back payments-api?')).toBeInTheDocument();

	const approve = screen.container.querySelector('button.approve') as HTMLButtonElement;
	expect(approve.disabled).toBe(true); // requireComment gates the decision

	const textarea = screen.container.querySelector('textarea') as HTMLTextAreaElement;
	textarea.value = 'rolling back, error budget gone';
	textarea.dispatchEvent(new Event('input', { bubbles: true }));

	await expect.poll(() => approve.disabled).toBe(false);
	approve.click();

	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('rollback_approved');
	expect(actions[0]!.context.comment).toBe('rolling back, error budget gone');
	expect(actions[0]!.context.deployId).toBe('deploy-4190'); // path resolved at dispatch

	// The card settles: no second decision possible.
	await expect.element(screen.getByText(/approved/)).toBeInTheDocument();
	expect(screen.container.querySelector('button.approve')).toBeNull();
});
