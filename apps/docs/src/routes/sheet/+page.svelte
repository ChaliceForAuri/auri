<script lang="ts">
	import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
	import { opsCatalog, OPS_CATALOG_ID } from '@aurilabs/ops';

	/**
	 * The visual sheet: every M2 component in every intent, plus the in-between
	 * states (skeleton via deliberately-unresolved bindings, designed empty).
	 * Screenshot-diffed manually before releases; toggle dark in the header.
	 */

	const BASIC = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json';
	const catalog = createCatalogRegistry([opsCatalog, basicCatalog]);
	const client = new A2uiClient();

	const col = (id: string, children: string[]) => ({
		id,
		component: 'Column',
		catalogId: BASIC,
		children
	});
	const row = (id: string, children: string[]) => ({
		id,
		component: 'Row',
		catalogId: BASIC,
		children,
		align: 'stretch'
	});
	const heading = (id: string, text: string) => ({
		id,
		component: 'Text',
		catalogId: BASIC,
		text,
		variant: 'caption'
	});

	client.ingest({
		version: 'v1.0',
		createSurface: {
			surfaceId: 'sheet',
			catalogId: OPS_CATALOG_ID,
			dataModel: {
				deploys: [
					{
						service: 'payments-api',
						status: 'Live',
						durationSec: 142,
						startedAt: '2026-08-17T14:02:11Z'
					},
					{
						service: 'checkout-web',
						status: 'Canary',
						durationSec: 98,
						startedAt: '2026-08-17T14:10:40Z'
					},
					{
						service: 'search-index',
						status: 'Failed',
						durationSec: 311,
						startedAt: '2026-08-17T13:55:03Z'
					}
				],
				none: []
			},
			components: [
				col('root', [
					'h_stat',
					'stats_a',
					'stats_b',
					'h_badge',
					'badges',
					'h_callout',
					'callouts',
					'h_table',
					'table_full',
					'table_empty',
					'table_skeleton',
					'h_approval',
					'approval'
				]),

				heading('h_stat', 'Stat — intents, currency, skeleton'),
				row('stats_a', ['stat_good', 'stat_bad', 'stat_warning']),
				row('stats_b', ['stat_neutral', 'stat_usd', 'stat_skeleton']),
				{
					id: 'stat_good',
					component: 'Stat',
					weight: 1,
					label: 'Uptime',
					value: 99.98,
					unit: '%',
					delta: 0.01,
					trend: 'flat',
					intent: 'good',
					caption: 'last 30 days'
				},
				{
					id: 'stat_bad',
					component: 'Stat',
					weight: 1,
					label: 'Error rate',
					value: 4.8,
					unit: '%',
					delta: 4.4,
					trend: 'up',
					intent: 'bad',
					caption: 'last 15 min'
				},
				{
					id: 'stat_warning',
					component: 'Stat',
					weight: 1,
					label: 'p95 latency',
					value: 340,
					unit: 'ms',
					delta: 45,
					trend: 'up',
					intent: 'warning',
					caption: 'vs previous hour'
				},
				{
					id: 'stat_neutral',
					component: 'Stat',
					weight: 1,
					label: 'Requests',
					value: 128455,
					unit: 'req/s',
					caption: 'no judgment, tabular figures'
				},
				{
					id: 'stat_usd',
					component: 'Stat',
					weight: 1,
					label: 'Revenue today',
					value: 12400,
					unit: 'USD',
					delta: 1200,
					trend: 'up',
					intent: 'good',
					caption: 'vs yesterday'
				},
				{
					id: 'stat_skeleton',
					component: 'Stat',
					weight: 1,
					label: 'Waiting on data',
					value: { path: '/never' },
					caption: 'skeleton state'
				},

				heading('h_badge', 'Badge — the shared intent scale, plus skeleton'),
				row('badges', ['b_good', 'b_bad', 'b_warning', 'b_info', 'b_neutral', 'b_skeleton']),
				{ id: 'b_good', component: 'Badge', text: 'Live', intent: 'good' },
				{ id: 'b_bad', component: 'Badge', text: 'Failed', intent: 'bad' },
				{ id: 'b_warning', component: 'Badge', text: 'Canary', intent: 'warning' },
				{ id: 'b_info', component: 'Badge', text: 'Scheduled', intent: 'info' },
				{ id: 'b_neutral', component: 'Badge', text: 'Archived' },
				{ id: 'b_skeleton', component: 'Badge', text: { path: '/never' } },

				heading('h_callout', 'Callout — resting intent is info; markdown inline'),
				col('callouts', ['c_info', 'c_warning', 'c_bad', 'c_good', 'c_neutral']),
				{
					id: 'c_info',
					component: 'Callout',
					title: 'Deploy window tonight',
					text: 'Payments API deploys **21:00–21:30 UTC**. Expect brief elevated latency on `/charge`.'
				},
				{
					id: 'c_warning',
					component: 'Callout',
					title: 'Mitigation in progress',
					text: 'Rolled back to build **4189**. Watching error rate before closing the incident.',
					intent: 'warning'
				},
				{
					id: 'c_bad',
					component: 'Callout',
					title: 'Checkout is failing',
					text: 'Error rate at **4.8%** and climbing. On-call has been paged.',
					intent: 'bad'
				},
				{
					id: 'c_good',
					component: 'Callout',
					title: 'Recovered',
					text: 'Error rate back under **0.5%** for 10 minutes.',
					intent: 'good'
				},
				{
					id: 'c_neutral',
					component: 'Callout',
					text: 'A neutral note, title-less, making no claim at all.',
					intent: 'neutral'
				},

				heading('h_table', 'DataTable — bound rows, sortable duration; empty; skeleton'),
				{
					id: 'table_full',
					component: 'DataTable',
					label: "Today's deploys",
					columns: [
						{ key: 'service', label: 'Service' },
						{ key: 'status', label: 'Status' },
						{
							key: 'durationSec',
							label: 'Duration',
							align: 'end',
							format: 'number',
							sortable: true
						},
						{ key: 'startedAt', label: 'Started', format: 'datetime' }
					],
					rows: { path: '/deploys' },
					rowAction: { event: { name: 'view_deploy' } }
				},
				{
					id: 'table_empty',
					component: 'DataTable',
					label: 'Empty state',
					columns: [
						{ key: 'name', label: 'Alert' },
						{ key: 'count', label: 'Fired', align: 'end', format: 'number' }
					],
					rows: { path: '/none' },
					emptyText: 'No alerts fired this week.'
				},
				{
					id: 'table_skeleton',
					component: 'DataTable',
					label: 'Skeleton state (rows never resolve)',
					columns: [
						{ key: 'a', label: 'Waiting' },
						{ key: 'b', label: 'On' },
						{ key: 'c', label: 'Data' }
					],
					rows: { path: '/never' }
				},

				heading('h_approval', 'ApprovalCard — comment required, decide it'),
				{
					id: 'approval',
					component: 'ApprovalCard',
					title: 'Roll back payments-api to build 4189?',
					summary:
						'Error rate hit **4.8%** after deploy 4190. Rolling back restores build 4189 in about 2 minutes.',
					requireComment: true,
					approveLabel: 'Roll back',
					rejectLabel: 'Keep 4190',
					approveAction: {
						event: { name: 'rollback_approved', context: { deployId: 'deploy-4190' } }
					},
					rejectAction: { event: { name: 'rollback_rejected' } }
				}
			] as never[]
		}
	});
</script>

<svelte:head>
	<title>auri — visual sheet</title>
</svelte:head>

<section class="sheet-intro">
	<h1>The visual sheet</h1>
	<p>
		Every M2 component in every intent, plus the in-between states — skeletons are
		deliberately-unresolved bindings, empties are designed, nothing here is a special screenshot
		mode. Toggle dark in the header; this page is the pre-release visual diff.
	</p>
</section>

<Surface {client} {catalog} surfaceId="sheet" />

<style>
	.sheet-intro {
		max-width: 44rem;
		padding: 2rem 0 1rem;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.6rem;
		letter-spacing: -0.02em;
	}
	p {
		margin: 0;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}
</style>
