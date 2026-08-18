/**
 * The flagship scenario, seed version: an agent handles a payments incident —
 * status flips, stats climb, a table streams in, an ApprovalCard interrupts,
 * and after the rollback the numbers recover. Replayed client-side with
 * realistic pauses; every line is also fed to the wire rail via `tap`, in both
 * directions, because showing the protocol IS the pitch.
 */

import type { AgentToRenderer, RendererToAgent, Transport } from 'svelte-a2ui';
import { createEmitter } from 'svelte-a2ui';

const OPS = 'https://chaliceforauri.github.io/auri/catalogs/ops/v1.json';
const BASIC = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json';
export const SURFACE = 'console';

type Step = AgentToRenderer | { __pause: number };

const SCRIPT: Step[] = [
	{ version: 'v1.0', createSurface: { surfaceId: SURFACE, catalogId: OPS } },
	{
		version: 'v1.0',
		updateDataModel: {
			surfaceId: SURFACE,
			value: {
				status: 'Healthy',
				statusIntent: 'good',
				errorRate: 0.4,
				errorDelta: 0.0,
				p95: 212,
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
						status: 'Live',
						durationSec: 311,
						startedAt: '2026-08-17T13:55:03Z'
					}
				]
			}
		}
	},
	{ __pause: 500 },

	// The frame paints first: title row with the live status badge.
	{
		version: 'v1.0',
		updateComponents: {
			surfaceId: SURFACE,
			components: [
				{ id: 'root', component: 'Column', catalogId: BASIC, children: ['header_row'] },
				{
					id: 'header_row',
					component: 'Row',
					catalogId: BASIC,
					children: ['title', 'status_badge'],
					justify: 'spaceBetween',
					align: 'center'
				},
				{ id: 'title', component: 'Text', catalogId: BASIC, text: 'payments — production' },
				{
					id: 'status_badge',
					component: 'Badge',
					text: { path: '/status' },
					intent: { path: '/statusIntent' }
				}
			]
		}
	},
	{ __pause: 700 },

	{
		version: 'v1.0',
		updateComponents: {
			surfaceId: SURFACE,
			components: [
				{
					id: 'root',
					component: 'Column',
					catalogId: BASIC,
					children: ['header_row', 'stats_row']
				},
				{
					id: 'stats_row',
					component: 'Row',
					catalogId: BASIC,
					children: ['error_stat', 'p95_stat'],
					align: 'stretch'
				},
				{
					id: 'error_stat',
					component: 'Stat',
					weight: 1,
					label: 'Error rate',
					value: { path: '/errorRate' },
					unit: '%',
					delta: { path: '/errorDelta' },
					intent: { path: '/statusIntent' },
					caption: 'last 15 min'
				},
				{
					id: 'p95_stat',
					component: 'Stat',
					weight: 1,
					label: 'Checkout p95',
					value: { path: '/p95' },
					unit: 'ms',
					delta: -8,
					trend: 'down',
					intent: 'good',
					caption: 'vs previous hour'
				}
			]
		}
	},
	{ __pause: 700 },

	{
		version: 'v1.0',
		updateComponents: {
			surfaceId: SURFACE,
			components: [
				{
					id: 'root',
					component: 'Column',
					catalogId: BASIC,
					children: ['header_row', 'stats_row', 'deploys_table']
				},
				{
					id: 'deploys_table',
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
					emptyText: 'No deploys yet today.'
				}
			]
		}
	},
	{ __pause: 1100 },

	// The incident: data changes, the same components tell a different story.
	{
		version: 'v1.0',
		updateDataModel: {
			surfaceId: SURFACE,
			value: {
				status: 'Degraded',
				statusIntent: 'warning',
				errorRate: 2.1,
				errorDelta: 1.7,
				p95: 288,
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
						status: 'Live',
						durationSec: 311,
						startedAt: '2026-08-17T13:55:03Z'
					}
				]
			}
		}
	},
	{ __pause: 900 },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorRate', value: 4.8 } },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorDelta', value: 4.4 } },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/statusIntent', value: 'bad' } },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/status', value: 'Incident' } },
	{ __pause: 600 },

	{
		version: 'v1.0',
		updateComponents: {
			surfaceId: SURFACE,
			components: [
				{
					id: 'root',
					component: 'Column',
					catalogId: BASIC,
					children: ['header_row', 'stats_row', 'spike_note', 'deploys_table']
				},
				{
					id: 'spike_note',
					component: 'Callout',
					title: 'Error spike after deploy 4190',
					text: 'Checkout error rate began climbing right after **payments-api deploy 4190** went live at 14:02 UTC.',
					intent: 'warning'
				}
			]
		}
	},
	{ __pause: 1000 },

	{
		version: 'v1.0',
		updateComponents: {
			surfaceId: SURFACE,
			components: [
				{
					id: 'root',
					component: 'Column',
					catalogId: BASIC,
					children: ['header_row', 'stats_row', 'spike_note', 'rollback', 'deploys_table']
				},
				{
					id: 'rollback',
					component: 'ApprovalCard',
					title: 'Roll back payments-api to build 4189?',
					summary:
						'Error rate hit **4.8%** after deploy 4190. Rolling back restores build 4189 in about 2 minutes.',
					requireComment: true,
					approveLabel: 'Roll back',
					rejectLabel: 'Keep 4190',
					approveAction: {
						event: {
							name: 'rollback_approved',
							context: { deployId: 'deploy-4190', target: 'build-4189' }
						}
					},
					rejectAction: {
						event: { name: 'rollback_rejected', context: { deployId: 'deploy-4190' } }
					}
				}
			]
		}
	},

	// Recovery, on a long beat — the console keeps living whether or not the
	// visitor decided. (The interactive branch is a docs-app v2 concern.)
	{ __pause: 6000 },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorRate', value: 1.2 } },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorDelta', value: -3.6 } },
	{
		version: 'v1.0',
		updateDataModel: { surfaceId: SURFACE, path: '/statusIntent', value: 'warning' }
	},
	{
		version: 'v1.0',
		updateDataModel: { surfaceId: SURFACE, path: '/status', value: 'Recovering' }
	},
	{ __pause: 1600 },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorRate', value: 0.5 } },
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/errorDelta', value: -4.3 } },
	{
		version: 'v1.0',
		updateDataModel: { surfaceId: SURFACE, path: '/statusIntent', value: 'good' }
	},
	{ version: 'v1.0', updateDataModel: { surfaceId: SURFACE, path: '/status', value: 'Healthy' } }
];

export interface RailLine {
	dir: 'in' | 'out';
	kind: string;
	text: string;
}

function kindOf(message: AgentToRenderer | RendererToAgent): string {
	const keys = Object.keys(message).filter((k) => k !== 'version' && k !== 'metadata');
	return keys[0] ?? 'message';
}

/** A Transport that replays the script and reports both directions to `tap`. */
export function createIncidentReplay(tap: (line: RailLine) => void): Transport {
	const emitter = createEmitter();
	let cancelled = false;

	return {
		async start() {
			for (const step of SCRIPT) {
				if (cancelled) return;
				if ('__pause' in step) {
					await new Promise((resolve) => setTimeout(resolve, step.__pause));
					continue;
				}
				tap({ dir: 'in', kind: kindOf(step), text: JSON.stringify(step) });
				emitter.emit(step);
			}
		},
		subscribe: emitter.subscribe,
		send(message) {
			// No live agent behind the static site — the rail shows what one
			// would receive, which is the point.
			tap({ dir: 'out', kind: kindOf(message), text: JSON.stringify(message) });
		},
		close() {
			cancelled = true;
			emitter.clear();
		}
	};
}
