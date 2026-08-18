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
				none: [],
				err5: [0.2, 0.3, 1.8, 4.2, 3.1, 1.2],
				err4: [1.1, 1.0, 1.2, 1.3, 1.2, 1.1],
				times: [
					'2026-08-17T13:00:00Z',
					'2026-08-17T13:15:00Z',
					'2026-08-17T13:30:00Z',
					'2026-08-17T13:45:00Z',
					'2026-08-17T14:00:00Z',
					'2026-08-17T14:15:00Z'
				],
				p95Readings: [178, 182, 175, 190, 260, 240, 210, 195, 188, 199, 205, 214],
				events: [
					{ title: 'Build 4191 started', time: '2026-08-17T14:20:05Z' },
					{
						title: 'Canary healthy',
						time: '2026-08-17T14:21:40Z',
						intent: 'good',
						text: 'All probes passing on pod 1.'
					},
					{ title: 'Rollout began', time: '2026-08-17T14:22:10Z' },
					{
						title: 'Pod 4 readiness probe slow',
						time: '2026-08-17T14:24:02Z',
						intent: 'warning',
						text: 'Worth watching — pod 4 is **2.1s** over the probe budget.'
					}
				],
				logTail:
					'14:22:10 pulling image registry/payments-api:4191\n14:22:31 starting pod 4 of 10\n14:22:44 waiting on readiness probe (pod 4)\n14:23:02 pod 4 ready\n14:23:05 starting pod 5 of 10'
			},
			components: [
				col('root', [
					'h_stat',
					'stats_a',
					'stats_b',
					'h_badge',
					'badges',
					'h_spark',
					'sparks',
					'h_chart',
					'chart_line',
					'chart_bar',
					'h_progress',
					'progresses',
					'h_callout',
					'callouts',
					'h_timeline',
					'timeline',
					'h_keyvalue',
					'keyvalue',
					'h_code',
					'codeblock',
					'h_table',
					'table_full',
					'table_empty',
					'table_skeleton',
					'h_approval',
					'approval',
					'h_confirm',
					'confirm_row'
				]),

				heading('h_spark', 'Sparkline — word-sized trends, generated text alternative'),
				row('sparks', ['sp_warning', 'sp_good', 'sp_neutral', 'sp_skeleton']),
				{
					id: 'sp_warning',
					component: 'Sparkline',
					label: 'p95 latency, last hour',
					values: { path: '/p95Readings' },
					intent: 'warning'
				},
				{
					id: 'sp_good',
					component: 'Sparkline',
					label: 'error rate, falling',
					values: [4.8, 3.9, 3.1, 2.2, 1.4, 0.9, 0.5],
					intent: 'good'
				},
				{
					id: 'sp_neutral',
					component: 'Sparkline',
					label: 'requests, no claim',
					values: [110, 140, 128, 133, 151, 149, 160]
				},
				{ id: 'sp_skeleton', component: 'Sparkline', label: 'waiting', values: { path: '/never' } },

				heading('h_chart', 'Chart — line with datetime axis; bar; ramp colors'),
				{
					id: 'chart_line',
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
				},
				{
					id: 'chart_bar',
					component: 'Chart',
					kind: 'bar',
					label: 'Incidents per day',
					series: [{ label: 'Incidents', values: [2, 0, 5, 1, 3, 0, 1] }],
					xLabels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
				},

				heading('h_progress', 'Progress — determinate, indeterminate, judged'),
				col('progresses', ['pg_deploy', 'pg_indet', 'pg_bad']),
				{
					id: 'pg_deploy',
					component: 'Progress',
					label: 'Rolling out build 4191',
					value: 7,
					max: 10
				},
				{ id: 'pg_indet', component: 'Progress', label: 'Waiting for the canary…' },
				{
					id: 'pg_bad',
					component: 'Progress',
					label: 'Error budget consumed',
					value: 92,
					intent: 'bad'
				},

				heading('h_timeline', 'Timeline — events are data; intent per event'),
				{
					id: 'timeline',
					component: 'Timeline',
					label: 'Rollout so far',
					items: { path: '/events' },
					emptyText: 'Nothing yet.'
				},

				heading('h_keyvalue', 'KeyValue — labeled facts, ISO dates and numbers formatted'),
				{
					id: 'keyvalue',
					component: 'KeyValue',
					label: 'checkout-web',
					items: [
						{ key: 'Region', value: 'eu-west-1' },
						{ key: 'Runtime', value: 'node 24' },
						{ key: 'Owner', value: 'team payments' },
						{ key: 'Last deploy', value: '2026-08-17T09:12:00Z' },
						{ key: 'Requests today', value: 128455 }
					]
				},

				heading('h_code', 'CodeBlock — verbatim, copy built in, streams log tails'),
				{
					id: 'codeblock',
					component: 'CodeBlock',
					label: 'deploy log',
					language: 'log',
					code: { path: '/logTail' }
				},

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
				},

				heading('h_confirm', 'ConfirmButton — the confirm step is part of the component'),
				row('confirm_row', ['cf_bad', 'cf_neutral']),
				{
					id: 'cf_bad',
					component: 'ConfirmButton',
					label: 'Abort rollout',
					confirmLabel: 'Really abort?',
					intent: 'bad',
					action: { event: { name: 'rollout_aborted', context: { buildId: 4191 } } }
				},
				{
					id: 'cf_neutral',
					component: 'ConfirmButton',
					label: 'Restart worker pool',
					action: { event: { name: 'pool_restarted', context: { pool: 'workers-eu1' } } }
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
