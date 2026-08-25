<script lang="ts">
	import { getRenderContext, Slot } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope, SlotContent } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import {
		confidenceBand,
		formatCount,
		formatMetricValue,
		formatWindow,
		humanizeKind,
		normalizeIntent
	} from '../format.js';

	interface Tag {
		label: string;
		count?: number;
	}

	interface Metric {
		label: string;
		value: number;
		unit?: string;
		intent?: string;
	}

	interface Props {
		headline?: unknown;
		subjectKind?: unknown;
		subjectId?: unknown;
		summary?: unknown;
		signalType?: unknown;
		intent?: unknown;
		trend?: unknown;
		metrics?: unknown;
		windowStart?: unknown;
		windowEnd?: unknown;
		confidence?: unknown;
		tags?: unknown;
		/** Registered `raw`: subject (and verdict) are merged before dispatch. */
		drillAction?: unknown;
		feedbackAction?: unknown;
		slots: Record<string, SlotContent>;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let {
		headline,
		subjectKind,
		subjectId,
		summary,
		signalType,
		intent,
		trend,
		metrics,
		windowStart,
		windowEnd,
		confidence,
		tags,
		drillAction,
		feedbackAction,
		slots,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

	const tone = $derived(normalizeIntent(intent));
	const signal = $derived(humanizeKind(signalType));
	const band = $derived(confidenceBand(confidence));
	const window_ = $derived(formatWindow(windowStart, windowEnd));
	const tagList: Tag[] = $derived(
		Array.isArray(tags)
			? tags.filter(
					(t): t is Tag => Boolean(t) && typeof t === 'object' && typeof t.label === 'string'
				)
			: []
	);

	const metricList: Metric[] = $derived(
		Array.isArray(metrics)
			? metrics.filter(
					(m): m is Metric =>
						Boolean(m) &&
						typeof m === 'object' &&
						typeof m.label === 'string' &&
						typeof m.value === 'number'
				)
			: []
	);

	const subject = $derived({ subjectKind, subjectId });
	const drillable = $derived(Boolean(drillAction) && typeof drillAction === 'object');

	function drill() {
		if (!drillable) return;
		rc.client.dispatch(
			rc.surfaceId,
			withSubject(drillAction as Action, subject),
			a2ui.id,
			a2ui.scope
		);
	}

	// Feedback must visibly respond (DESIGN 8): the acknowledged state is the
	// card's own; removal/de-emphasis is the agent's, via the data model.
	let acknowledged = $state<'up' | 'down' | null>(null);

	function feedback(verdict: 'up' | 'down') {
		if (!feedbackAction || typeof feedbackAction !== 'object') return;
		acknowledged = verdict;
		rc.client.dispatch(
			rc.surfaceId,
			withSubject(feedbackAction as Action, { ...subject, verdict }),
			a2ui.id,
			a2ui.scope
		);
	}
</script>

<article
	class="auri-insight auri-enter"
	data-intent={tone}
	style:flex-grow={weight}
	aria-label={ariaLabel ?? String(headline ?? '')}
>
	<header>
		<div class="chips" aria-hidden="true">
			{#if signal}<span class="chip signal">{signal}</span>{/if}
			{#if trend === 'up' || trend === 'down' || trend === 'flat'}
				<span class="chip trend">{trend === 'up' ? '↗' : trend === 'down' ? '↘' : '→'}</span>
			{/if}
			{#if band}<span class="chip band">{band} confidence</span>{/if}
		</div>
		{#if drillable}
			<button type="button" class="headline as-button" onclick={drill}>{headline}</button>
		{:else}
			<h3 class="headline">{headline}</h3>
		{/if}
	</header>

	{#if summary}<p class="summary">{summary}</p>{/if}

	<dl class="facts">
		{#each metricList as m (m.label)}
			<div>
				<dt>{m.label}</dt>
				<dd class="metric" data-intent={normalizeIntent(m.intent)}>
					{formatMetricValue(m.value, m.unit)}
				</dd>
			</div>
		{/each}
		{#if window_}
			<div>
				<dt>window</dt>
				<dd>{window_}</dd>
			</div>
		{/if}
	</dl>

	{#if tagList.length > 0}
		<ul class="tags">
			{#each tagList as t (t.label)}
				<li>
					{t.label}{#if t.count !== undefined}<span class="count">{formatCount(t.count)}</span>{/if}
				</li>
			{/each}
		</ul>
	{/if}

	{#if slots.detailComponentId}
		<details>
			<summary>details</summary>
			<Slot content={slots.detailComponentId} />
		</details>
	{/if}

	{#if feedbackAction && typeof feedbackAction === 'object'}
		<footer class="feedback">
			{#if acknowledged}
				<span class="ack" role="status"
					>noted{acknowledged === 'down' ? ' — we’ll show fewer like this' : ''}</span
				>
			{:else}
				<button type="button" class="thumb" aria-label="helpful" onclick={() => feedback('up')}
					>👍</button
				>
				<button
					type="button"
					class="thumb"
					aria-label="not helpful"
					onclick={() => feedback('down')}>👎</button
				>
			{/if}
		</footer>
	{/if}
</article>

<style>
	/* Foundation card; the intent tints the signal chip, never the whole card. */
	.auri-insight {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 1rem 1.125rem;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
		display: flex;
		flex-direction: column;
		gap: 0.6rem;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 0.45rem;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}
	.chip {
		font-size: var(--auri-type-caption-size);
		font-weight: var(--auri-type-label-weight);
		padding: 0.1rem 0.55rem;
		border-radius: var(--auri-shape-sm);
		background: var(--auri-surface-container-high);
		color: var(--auri-on-surface-variant);
	}
	[data-intent='warning'] .chip.signal {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	[data-intent='bad'] .chip.signal {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	[data-intent='good'] .chip.signal {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	[data-intent='info'] .chip.signal {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}

	/* The headline is the last thing an LLM finishes writing (issue #21):
	   exactly two lines are reserved, so late arrival shifts nothing. */
	.headline {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.35;
		min-height: calc(2 * 1.35em);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
		color: var(--auri-on-surface);
	}
	.headline.as-button {
		all: unset;
		cursor: pointer;
		font-size: 1.0625rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		line-height: 1.35;
		min-height: calc(2 * 1.35em);
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		line-clamp: 2;
		overflow: hidden;
		color: var(--auri-on-surface);
	}
	.headline.as-button:hover {
		color: var(--auri-primary);
	}
	.headline.as-button:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
		border-radius: var(--auri-shape-sm);
	}

	.summary {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		color: var(--auri-on-surface-variant);
	}

	.facts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem 1.5rem;
		margin: 0;
	}
	.facts div {
		display: flex;
		flex-direction: column;
	}
	.facts dt {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}
	.facts dd {
		margin: 0;
		font-size: 1.05rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--auri-on-surface);
	}
	/*
	 * A metric carrying an intent gets the filled tonal container that DESIGN.md
	 * makes the signal — the same treatment ops Stat gives its chip, so one figure
	 * reads identically across catalogs. Neutral stays plain text: if every metric
	 * were a chip the row would be a wall of colour and none of it would signal.
	 */
	.facts dd.metric[data-intent]:not([data-intent='neutral']) {
		display: inline-block;
		padding: 0.05rem 0.45rem;
		border-radius: var(--auri-shape-sm);
	}
	.facts dd.metric[data-intent='good'] {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	.facts dd.metric[data-intent='bad'] {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	.facts dd.metric[data-intent='warning'] {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	.facts dd.metric[data-intent='info'] {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}

	.tags {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
	}
	.tags li {
		font-size: var(--auri-type-caption-size);
		padding: 0.1rem 0.55rem;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-pill);
		color: var(--auri-on-surface-variant);
	}
	.tags .count {
		font-variant-numeric: tabular-nums;
		font-weight: 600;
	}

	details summary {
		cursor: pointer;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}

	.feedback {
		display: flex;
		gap: 0.35rem;
		align-items: center;
		min-height: 1.8rem;
	}
	.thumb {
		font: inherit;
		font-size: 0.8125rem;
		line-height: 1;
		padding: 0.25rem 0.5rem;
		background: transparent;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-sm);
		cursor: pointer;
	}
	.thumb:hover {
		background: var(--auri-surface-container-high);
	}
	.thumb:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}
	.ack {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}
</style>
