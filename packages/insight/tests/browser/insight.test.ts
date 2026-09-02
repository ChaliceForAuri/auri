/// <reference types="vite/client" />

import { expect, test } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import type { AgentToRenderer, ComponentSpec, RendererAction } from 'svelte-a2ui';
import { opsCatalog } from '../../../ops/src/lib/index.js';
import { insightCatalog, confidenceBand, describeVector } from '../../src/lib/index.js';

const SURFACE = 'test';
const catalog = createCatalogRegistry([insightCatalog, opsCatalog, basicCatalog]);

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
		createSurface: { surfaceId: SURFACE, catalogId: insightCatalog.id, components, dataModel }
	});
}

function setData(client: A2uiClient, path: string, value: unknown): void {
	client.ingest({ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path, value } });
}

function model(client: A2uiClient): Record<string, unknown> {
	return client.state.surfaces[SURFACE]!.dataModel as Record<string, unknown>;
}

/* ------------------------------------------------------------------ helpers */

test('confidenceBand and describeVector are honest', () => {
	expect(confidenceBand(0.8)).toBe('high');
	expect(confidenceBand(0.5)).toBe('medium');
	expect(confidenceBand(0.1)).toBe('low');
	expect(confidenceBand(1.2)).toBeNull();
	expect(describeVector(9, -12, 'Volume', 'Sentiment')).toBe(
		'Sentiment falling sharply, Volume rising sharply'
	);
});

/* ---------------------------------------------------------- fixture replay */

const fixtures = import.meta.glob('../../contract/examples/*.jsonl', {
	eager: true,
	query: '?raw',
	import: 'default'
}) as Record<string, string>;

// Globally unique across ALL mounted fixtures (page-scoped locators).
const MARKERS: Record<string, string> = {
	'insight-card': 'Rounding',
	'source-audit': 'Support call — Acme Corp',
	'velocity-scatter': 'Account health velocity',
	'cluster-map': 'SSO friction',
	'drill-stack': 'Affected accounts',
	treemap: 'Reporting'
};

test('every contract fixture replays into a live surface', async () => {
	const names = Object.keys(fixtures);
	expect(names).toHaveLength(Object.keys(MARKERS).length);
	for (const file of names) {
		const stem = file.split('/').pop()!.replace('.jsonl', '');
		const client = makeClient();
		const screen = await render(Surface, { props: { client, catalog, surfaceId: 'i' } });
		for (const line of fixtures[file]!.split('\n')) {
			if (line.trim()) client.ingest(JSON.parse(line) as AgentToRenderer);
		}
		await expect.element(screen.getByText(MARKERS[stem]!, { exact: false })).toBeInTheDocument();
	}
});

/* ------------------------------------------------------------- InsightCard */

const INSIGHT = {
	id: 'root',
	component: 'InsightCard',
	headline: 'Report-accuracy complaints are accelerating',
	subjectKind: 'cluster',
	subjectId: 'cl-report-accuracy',
	signalType: 'friction',
	intent: 'warning',
	confidence: 0.8,
	metrics: [
		{ label: 'Cases', value: 312 },
		{ label: 'Revenue at risk', value: 1200000, unit: 'USD', intent: 'bad' }
	],
	tags: [{ label: 'Export totals', count: 204 }, { label: 'Rounding' }],
	drillAction: { event: { name: 'insight_drilled', context: { source: 'feed' } } },
	feedbackAction: { event: { name: 'insight_feedback' } }
};

test('InsightCard renders band + money, and merges subject into drill', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [INSIGHT as never]);

	await expect.element(screen.getByText('high confidence')).toBeInTheDocument();
	// unit 'USD' is an ISO 4217 code, so it formats as money in the host locale
	await expect.element(screen.getByText('$1,200,000')).toBeInTheDocument();
	await expect.element(screen.getByText('Revenue at risk')).toBeInTheDocument();
	await expect.element(screen.getByText('312')).toBeInTheDocument();
	// a tag without a count still renders — count is optional now
	await expect.element(screen.getByText('Rounding', { exact: false })).toBeInTheDocument();

	(screen.container.querySelector('.headline.as-button') as HTMLButtonElement).click();
	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('insight_drilled');
	expect(actions[0]!.context.subjectKind).toBe('cluster');
	expect(actions[0]!.context.subjectId).toBe('cl-report-accuracy');
	expect(actions[0]!.context.source).toBe('feed');
});

test('a column of points renders at its true position, with readable labels', async () => {
	/*
	 * The #55 shape: every baseline (x) identical, y spread — a quiet workspace
	 * that suddenly gets traffic. Two failures were reported together, and they
	 * share a cause: with no x-spread the scale had nothing to work with.
	 */
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [
		{
			id: 'root',
			component: 'VelocityScatter',
			label: 'Account velocity',
			xLabel: 'Baseline cases/hr',
			yLabel: 'Recent cases',
			points: [
				{ id: 'a', label: 'Cluster of 14 recent cases', x: 0, y: 14, dx: 0, dy: 3 },
				{ id: 'b', label: 'Cluster of 12 recent cases', x: 0, y: 12, dx: 0, dy: 2 },
				{ id: 'c', label: 'Cluster of 5 recent cases', x: 0, y: 5, dx: 0, dy: 1 }
			]
		} as never
	]);

	await expect.element(screen.getByText('Account velocity')).toBeInTheDocument();

	const svg = screen.container.querySelector('svg')!;
	const dots = [...svg.querySelectorAll('circle')].filter((c) => c.getAttribute('cx'));
	const plotLeft = 52; // M.left

	// Every dot sits at the axis origin, not floating mid-plot: a baseline of
	// zero must not be drawn where "mid-scale" would be.
	for (const dot of dots) {
		expect(Number(dot.getAttribute('cx'))).toBeCloseTo(plotLeft, 0);
	}

	// And the stacked labels clear each other.
	const ys = [...svg.querySelectorAll('text.dot-label')]
		.map((t) => Number(t.getAttribute('y')))
		.sort((a, b) => a - b);
	for (let i = 1; i < ys.length; i++) {
		expect(ys[i]! - ys[i - 1]!).toBeGreaterThanOrEqual(12);
	}
});

test('a metric whose binding has not resolved shows a placeholder, not nothing', async () => {
	/*
	 * Bindings resolve after the component arrives, so a metric bound to a path
	 * that is not in the data model yet must hold its place. It used to be
	 * filtered out entirely — the row would be short, then grow — and a path that
	 * never resolved vanished silently. The first consumer had to read the source
	 * to confirm this was safe, which is how a silent drop announces itself.
	 */
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [
		{
			...INSIGHT,
			metrics: [
				{ label: 'Cases', value: 312 },
				{ label: 'Revenue at risk', value: { path: '/notYetLoaded' }, unit: 'USD' }
			]
		} as never
	]);

	await expect.element(screen.getByText('Cases')).toBeInTheDocument();
	// The label holds its place...
	await expect.element(screen.getByText('Revenue at risk')).toBeInTheDocument();
	// ...with the unresolved value rendered as a placeholder rather than removed.
	const dds = [...screen.container.querySelectorAll('dd.metric')].map((d) => d.textContent?.trim());
	expect(dds).toContain('—');
});

test('a domain word the catalog has never seen still renders', async () => {
	/*
	 * signalType used to be a closed enum backed by a seven-entry label map, and an
	 * unlisted value returned null -- the component silently rendered NOTHING. Both
	 * are free strings now (principle 9), so a value from someone else's domain has
	 * to survive all the way to the screen.
	 */
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [
		{
			...INSIGHT,
			subjectKind: 'vendor',
			signalType: 'policy_drift',
			metrics: [{ label: 'Findings', value: 7, intent: 'warning' }]
		} as never
	]);

	await expect.element(screen.getByText('policy drift')).toBeInTheDocument();
	await expect.element(screen.getByText('Findings')).toBeInTheDocument();
	const metric = screen.container.querySelector('dd.metric[data-intent="warning"]');
	expect(metric?.textContent?.trim()).toBe('7');
});

test('InsightCard feedback merges the verdict and acknowledges visibly', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [INSIGHT as never]);

	await expect.element(screen.getByLabelText('not helpful')).toBeInTheDocument();
	(screen.container.querySelector('button[aria-label="not helpful"]') as HTMLButtonElement).click();

	expect(actions).toHaveLength(1);
	expect(actions[0]!.name).toBe('insight_feedback');
	expect(actions[0]!.context.verdict).toBe('down');
	expect(actions[0]!.context.subjectId).toBe('cl-report-accuracy');
	// Feedback must visibly respond (DESIGN 8): the pair is replaced by state.
	await expect.element(screen.getByText(/we’ll show fewer like this/)).toBeInTheDocument();
	expect(screen.container.querySelector('button[aria-label="helpful"]')).toBeNull();
});

/* -------------------------------------------------------------- ClusterMap */

test('ClusterMap drills with subject and reason merged', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [
		{
			id: 'root',
			component: 'ClusterMap',
			label: 'Accounts at risk, by reason',
			clusters: [
				{ id: 'cl-a', label: 'Report accuracy', size: 12, reason: 'Totals mismatch' },
				{ id: 'cl-b', label: 'Webhook delays', size: 4, reason: 'Events minutes late' }
			],
			clusterAction: { event: { name: 'cluster_drilled' } }
		} as never
	]);

	await expect.element(screen.getByText('Totals mismatch')).toBeInTheDocument();
	// Sorted by size descending: Report accuracy first.
	const tiles = screen.container.querySelectorAll('button.tile');
	expect(tiles).toHaveLength(2);
	expect(tiles[0]!.textContent).toContain('Report accuracy');

	(tiles[1] as HTMLButtonElement).click();
	expect(actions[0]!.name).toBe('cluster_drilled');
	expect(actions[0]!.context.subjectKind).toBe('cluster');
	expect(actions[0]!.context.subjectId).toBe('cl-b');
	expect(actions[0]!.context.reason).toBe('Events minutes late');
});

/* --------------------------------------------------------- VelocityScatter */

const SCATTER = {
	id: 'root',
	component: 'VelocityScatter',
	label: 'Account health velocity',
	xLabel: 'Support volume',
	yLabel: 'Sentiment',
	points: [
		{ id: 'acct-globex', label: 'Globex', x: 41, y: 58, dx: 2, dy: -4, weight: 350000 },
		{
			id: 'acct-acme',
			label: 'Acme Corp',
			x: 84,
			y: 32,
			dx: 9,
			dy: -12,
			intent: 'bad',
			weight: 480000
		},
		{ id: 'acct-initech', label: 'Initech', x: 12, y: 77, dx: -1, dy: 3, weight: 210000 }
	],
	pointAction: { event: { name: 'account_drilled' } }
};

test('VelocityScatter summarises the shape and traverses by weight', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(client, [SCATTER as never]);

	await expect.element(screen.getByText('Account health velocity')).toBeInTheDocument();
	const figure = screen.container.querySelector('figure.auri-scatter') as HTMLElement;
	const alt = figure.getAttribute('aria-label')!;
	// The shape, not the count: negatives, largest, fastest.
	expect(alt).toContain('2 with sentiment falling');
	expect(alt).toContain('largest: Acme Corp');
	expect(alt).toContain('fastest mover: Acme Corp');

	// One tab stop; traversal order is weight descending (Acme > Globex > Initech).
	const svg = screen.container.querySelector('svg[tabindex="0"]') as SVGSVGElement;
	svg.dispatchEvent(new FocusEvent('focus'));
	svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	expect(actions[0]!.context.subjectId).toBe('acct-acme');
	svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
	svg.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
	expect(actions[1]!.context.subjectId).toBe('acct-globex');
	expect(actions[1]!.context.subjectKind).toBe('account');
	expect(actions[1]!.context.pointLabel).toBe('Globex');
});

/* ------------------------------------------------------------- SourceAudit */

test('SourceAudit never autoplays, carries captions, and seeks via lines', async () => {
	const actions: RendererAction[] = [];
	const client = makeClient((action) => actions.push(action));
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'SourceAudit',
				label: 'Support call — Acme Corp, 14 Aug',
				mediaKind: 'video',
				durationSeconds: 847,
				captionsUrl: 'https://media.example.com/calls/ac-2214.vtt',
				transcript: { path: '/transcript' },
				seekAction: { event: { name: 'audit_seeked' } }
			} as never
		],
		{
			transcript: [
				{ startSeconds: 62, speaker: 'Customer', text: 'The export says 1.2 million.' },
				{ startSeconds: 81, speaker: 'Agent', text: 'Let me pull that report up.' }
			]
		}
	);

	await expect.element(screen.getByText('The export says 1.2 million.')).toBeInTheDocument();
	const video = screen.container.querySelector('video') as HTMLVideoElement;
	expect(video).not.toBeNull();
	expect(video.hasAttribute('autoplay')).toBe(false);
	expect(video.querySelector('track[kind="captions"]')).not.toBeNull();
	// duration renders from the wire, before any media metadata: 847s = 14:07.
	await expect.element(screen.getByText('14:07')).toBeInTheDocument();

	(screen.container.querySelectorAll('button.line')[1] as HTMLButtonElement).click();
	expect(actions[0]!.name).toBe('audit_seeked');
	expect(actions[0]!.context.startSeconds).toBe(81);
});

test('SourceAudit treats an empty transcript as processing, not an error', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'SourceAudit',
				label: 'Renewal call — Globex',
				mediaKind: 'audio',
				transcript: { path: '/transcript' }
			} as never
		],
		{ transcript: [] }
	);
	await expect.element(screen.getByText('transcript still processing')).toBeInTheDocument();
});

/* -------------------------------------------------------------- DrillStack */

test('DrillStack pushes by data, pops on Escape, and restores focus exactly', async () => {
	const client = makeClient();
	const screen = await render(Surface, { props: { client, catalog, surfaceId: SURFACE } });
	boot(
		client,
		[
			{
				id: 'root',
				component: 'DrillStack',
				levels: [
					{ title: 'Insights', componentId: 'insight' },
					{ title: 'Affected accounts', componentId: 'impact' }
				],
				activeIndex: { path: '/depth' }
			} as never,
			{ ...INSIGHT, id: 'insight' } as never,
			{
				id: 'impact',
				component: 'DataTable',
				catalogId: opsCatalog.id,
				columns: [{ key: 'company', label: 'Company' }],
				rows: [{ company: 'Acme Corp' }]
			} as never
		],
		{ depth: 0 }
	);

	await expect.element(screen.getByText('high confidence')).toBeInTheDocument();

	// Remember where focus was, push a level via DATA (the contract's way).
	const headline = screen.container.querySelector('.headline.as-button') as HTMLButtonElement;
	headline.focus();
	expect(document.activeElement).toBe(headline);
	setData(client, '/depth', 1);
	await expect.element(screen.getByText('Acme Corp')).toBeInTheDocument();
	// Focus moved to the PUSHED level's stage (levels stay mounted, hidden).
	const pushed = screen.container.querySelector(
		'.stage[aria-label="Affected accounts"]'
	) as HTMLElement;
	await expect.poll(() => document.activeElement).toBe(pushed);

	// Escape pops one level — the model reflects it, and focus returns EXACTLY.
	pushed.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
	await expect.poll(() => model(client).depth).toBe(0);
	await expect.poll(() => document.activeElement).toBe(headline);
});
