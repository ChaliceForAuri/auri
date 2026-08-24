/**
 * The flagship scenario: an agent handles a payments incident end to end —
 * status flips, stats climb, a chart and log tail appear as it investigates,
 * the timeline grows, an ApprovalCard interrupts for the rollback decision,
 * and the numbers recover. Replayed client-side with realistic pauses; every
 * line is fed to the wire rail via `tap`, both directions, because showing
 * the protocol IS the pitch.
 *
 * Data arrives in small slices (the prompt-pack's own rule) — which also makes
 * the rail legible.
 */

import type { AgentToRenderer, RendererToAgent, Transport } from 'svelte-a2ui';
import { createEmitter } from 'svelte-a2ui';

const OPS = 'https://chaliceforauri.github.io/auri/catalogs/ops/v2.json';
const FORMS = 'https://chaliceforauri.github.io/auri/catalogs/forms/v2.json';
const BASIC = 'https://a2ui.org/specification/v1_0/catalogs/basic/catalog.json';
export const SURFACE = 'console';

type Step = AgentToRenderer | { __pause: number };

const s = SURFACE;
const data = (value: Record<string, unknown>): Step => ({
	version: 'v1.0',
	updateDataModel: { surfaceId: s, value }
});
const patch = (path: string, value: unknown): Step => ({
	version: 'v1.0',
	updateDataModel: { surfaceId: s, path, value }
});
const components = (list: Record<string, unknown>[]): Step => ({
	version: 'v1.0',
	updateComponents: { surfaceId: s, components: list as never }
});

const DEPLOYS = [
	{ service: 'payments-api', status: 'Live', durationSec: 142, startedAt: '2026-08-17T14:02:11Z' },
	{ service: 'checkout-web', status: 'Canary', durationSec: 98, startedAt: '2026-08-17T14:10:40Z' },
	{ service: 'search-index', status: 'Live', durationSec: 311, startedAt: '2026-08-17T13:55:03Z' }
];

const EVENTS_BASE = [
	{ title: 'payments-api deploy 4190 live', time: '2026-08-17T14:02:11Z' },
	{ title: 'checkout-web canary started', time: '2026-08-17T14:10:40Z', intent: 'info' }
];

const EVENTS_SPIKE = [
	...EVENTS_BASE,
	{
		title: 'Error spike detected',
		time: '2026-08-17T14:24:10Z',
		intent: 'bad',
		text: 'Checkout 5xx rate crossed **4%**, paging on-call.'
	}
];

const EVENTS_ROLLBACK = [
	...EVENTS_SPIKE,
	{ title: 'Rollback to build 4189 started', time: '2026-08-17T14:26:02Z', intent: 'warning' }
];

const EVENTS_RECOVERED = [
	...EVENTS_ROLLBACK,
	{ title: 'Error rate back under 1%', time: '2026-08-17T14:28:40Z', intent: 'good' }
];

const LOG_1 = '14:23:51 checkout 5xx sample: POST /charge 502 (upstream timeout)';
const LOG_2 = LOG_1 + '\n14:24:08 error budget burn 12x, window 15m';
const LOG_3 = LOG_2 + '\n14:24:10 paging on-call (rotation payments-eu)';
const LOG_4 = LOG_3 + '\n14:26:02 rollback initiated: 4190 -> 4189';
const LOG_5 = LOG_4 + '\n14:28:40 error rate 0.6%, holding';

const SCRIPT: Step[] = [
	{ version: 'v1.0', createSurface: { surfaceId: s, catalogId: OPS } },

	// Baseline data, in slices.
	data({
		status: 'Healthy',
		statusIntent: 'good',
		errorRate: 0.4,
		errorDelta: 0.0,
		p95: 212,
		errTrend: [0.3, 0.4, 0.3, 0.5, 0.4, 0.4]
	}),
	patch('/deploys', DEPLOYS),
	{ __pause: 450 },

	// The frame paints first: title and the live status badge.
	components([
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
	]),
	{ __pause: 600 },

	components([
		{ id: 'root', component: 'Column', catalogId: BASIC, children: ['header_row', 'stats_row'] },
		{
			id: 'stats_row',
			component: 'Row',
			catalogId: BASIC,
			children: ['error_stat', 'p95_stat', 'err_spark'],
			align: 'center'
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
		},
		{
			id: 'err_spark',
			component: 'Sparkline',
			label: 'error rate, last 90 min',
			values: { path: '/errTrend' },
			intent: { path: '/statusIntent' }
		}
	]),
	{ __pause: 700 },

	components([
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
				{ key: 'durationSec', label: 'Duration', align: 'end', format: 'number', sortable: true },
				{ key: 'startedAt', label: 'Started', format: 'datetime' }
			],
			rows: { path: '/deploys' },
			emptyText: 'No deploys yet today.'
		}
	]),
	{ __pause: 1100 },

	// The incident: the same components start telling a different story.
	patch('/errorRate', 2.1),
	patch('/errorDelta', 1.7),
	patch('/status', 'Degraded'),
	patch('/statusIntent', 'warning'),
	patch('/errTrend', [0.3, 0.4, 0.3, 0.5, 0.4, 0.4, 1.2, 2.1]),
	patch('/p95', 288),
	{ __pause: 800 },

	patch('/errorRate', 4.8),
	patch('/errorDelta', 4.4),
	patch('/status', 'Incident'),
	patch('/statusIntent', 'bad'),
	patch('/errTrend', [0.3, 0.4, 0.3, 0.5, 0.4, 0.4, 1.2, 2.1, 3.6, 4.8]),
	{ __pause: 500 },

	// The agent investigates: a callout, then the evidence — chart, feed, log.
	components([
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
	]),
	{ __pause: 700 },

	// Slices, not a whole-model send — an omitted path REPLACES the data model.
	patch('/err5', [0.2, 0.2, 0.3, 1.8, 3.4, 4.5]),
	patch('/err4', [1.1, 1.0, 1.2, 1.2, 1.3, 1.2]),
	patch('/times', [
		'2026-08-17T13:00:00Z',
		'2026-08-17T13:15:00Z',
		'2026-08-17T13:30:00Z',
		'2026-08-17T13:45:00Z',
		'2026-08-17T14:00:00Z',
		'2026-08-17T14:15:00Z'
	]),
	patch('/events', EVENTS_SPIKE),
	patch('/logTail', LOG_1),
	components([
		{
			id: 'root',
			component: 'Column',
			catalogId: BASIC,
			children: [
				'header_row',
				'stats_row',
				'spike_note',
				'error_chart',
				'evidence_row',
				'deploys_table'
			]
		},
		{
			id: 'error_chart',
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
			id: 'evidence_row',
			component: 'Row',
			catalogId: BASIC,
			children: ['incident_feed', 'deploy_log'],
			align: 'stretch'
		},
		{
			id: 'incident_feed',
			component: 'Timeline',
			weight: 1,
			label: 'Incident timeline',
			items: { path: '/events' },
			emptyText: 'Nothing yet.'
		},
		{
			id: 'deploy_log',
			component: 'CodeBlock',
			weight: 1,
			label: 'error samples',
			language: 'log',
			code: { path: '/logTail' }
		}
	]),
	{ __pause: 900 },

	patch('/logTail', LOG_2),
	{ __pause: 700 },
	patch('/logTail', LOG_3),
	{ __pause: 600 },

	// The decision. Approving (or rejecting) emits a real action — watch the rail.
	components([
		{
			id: 'root',
			component: 'Column',
			catalogId: BASIC,
			children: [
				'header_row',
				'stats_row',
				'spike_note',
				'rollback',
				'error_chart',
				'evidence_row',
				'deploys_table'
			]
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
	]),

	// The agent proceeds on the runbook while the human reads: rollback starts,
	// then the numbers come home. The console lives whether or not you clicked.
	{ __pause: 4200 },
	patch('/events', EVENTS_ROLLBACK),
	patch('/logTail', LOG_4),
	{ __pause: 2200 },

	patch('/errorRate', 1.2),
	patch('/errorDelta', -3.6),
	patch('/status', 'Recovering'),
	patch('/statusIntent', 'warning'),
	patch('/errTrend', [0.4, 0.4, 1.2, 2.1, 3.6, 4.8, 3.1, 1.2]),
	patch('/err5', [0.2, 0.2, 0.3, 1.8, 3.4, 4.5, 1.4]),
	patch('/err4', [1.1, 1.0, 1.2, 1.2, 1.3, 1.2, 1.1]),
	patch('/times', [
		'2026-08-17T13:00:00Z',
		'2026-08-17T13:15:00Z',
		'2026-08-17T13:30:00Z',
		'2026-08-17T13:45:00Z',
		'2026-08-17T14:00:00Z',
		'2026-08-17T14:15:00Z',
		'2026-08-17T14:30:00Z'
	]),
	{ __pause: 1500 },

	patch('/errorRate', 0.6),
	patch('/errorDelta', -4.2),
	patch('/status', 'Healthy'),
	patch('/statusIntent', 'good'),
	patch('/errTrend', [0.4, 1.2, 2.1, 3.6, 4.8, 3.1, 1.2, 0.6]),
	patch('/p95', 218),
	patch('/events', EVENTS_RECOVERED),
	patch('/logTail', LOG_5),
	components([
		{
			id: 'spike_note',
			component: 'Callout',
			title: 'Rolled back to build 4189',
			text: 'Error rate back under **1%** and holding. Keeping the incident open for 30 minutes of observation.',
			intent: 'good'
		}
	]),

	// Act two: the incident is over, so the agent switches vocabulary — the
	// forms catalog mixes onto the SAME surface (explicit catalogId per
	// component, the protocol's mixing rule) to file the postmortem. The
	// SubmitBar arrives gated: the required summary is empty. Then the agent
	// drafts the summary itself via the data model, and the gate opens live —
	// no component re-sends, just data.
	{ __pause: 3200 },
	patch('/pm', { severity: 'sev2', summary: '', followUp: true }),
	components([
		{
			id: 'root',
			component: 'Column',
			catalogId: BASIC,
			children: [
				'header_row',
				'stats_row',
				'spike_note',
				'rollback',
				'error_chart',
				'evidence_row',
				'deploys_table',
				'postmortem'
			]
		},
		{
			id: 'postmortem',
			component: 'FormSection',
			catalogId: FORMS,
			title: 'File the postmortem',
			description: 'Resolved — capture it while it is fresh. I drafted the summary; edit and file.',
			children: ['pm_severity', 'pm_summary', 'pm_followup', 'pm_submit']
		},
		{
			id: 'pm_severity',
			component: 'RadioGroup',
			catalogId: FORMS,
			label: 'Severity',
			value: { path: '/pm/severity' },
			options: [
				{ value: 'sev1', label: 'Sev 1 — total outage' },
				{ value: 'sev2', label: 'Sev 2 — degraded' },
				{ value: 'sev3', label: 'Sev 3 — cosmetic' }
			],
			checks: [{ call: 'required', message: 'Choose a severity.' }]
		},
		{
			id: 'pm_summary',
			component: 'TextArea',
			catalogId: FORMS,
			label: 'What happened?',
			value: { path: '/pm/summary' },
			rows: 4,
			checks: [
				{
					call: 'length',
					args: { min: 30 },
					message: 'A sentence or two more helps the review.'
				}
			]
		},
		{
			id: 'pm_followup',
			component: 'Toggle',
			catalogId: FORMS,
			label: 'Schedule a follow-up review',
			value: { path: '/pm/followUp' }
		},
		{
			id: 'pm_submit',
			component: 'SubmitBar',
			catalogId: FORMS,
			submitLabel: 'File postmortem',
			submitAction: {
				event: {
					name: 'postmortem_filed',
					context: {
						severity: { path: '/pm/severity' },
						summary: { path: '/pm/summary' },
						followUp: { path: '/pm/followUp' }
					}
				}
			}
		}
	]),
	// The gate is closed (summary too short) — watch it open as the agent
	// writes its draft into the data model.
	{ __pause: 2600 },
	patch(
		'/pm/summary',
		'Deploy 4190 regressed checkout payment auth; 5xx peaked at 4.8% for 22 minutes. Rolled back to 4189 at 14:26 UTC; recovery confirmed by 14:31.'
	)
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
