<script lang="ts">
	import { getRenderContext, Slot } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope, SlotContent } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import {
		confidenceBand,
		formatCount,
		formatMoney,
		formatWindow,
		normalizeIntent,
		signalLabel
	} from '../format.js';

	interface Theme {
		label: string;
		count: number;
	}

	interface Props {
		headline?: unknown;
		subjectKind?: unknown;
		subjectId?: unknown;
		summary?: unknown;
		signalType?: unknown;
		intent?: unknown;
		trend?: unknown;
		caseCount?: unknown;
		windowStart?: unknown;
		windowEnd?: unknown;
		confidence?: unknown;
		revenueAtRisk?: unknown;
		currency?: unknown;
		themes?: unknown;
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
		caseCount,
		windowStart,
		windowEnd,
		confidence,
		revenueAtRisk,
		currency,
		themes,
		drillAction,
		feedbackAction,
		slots,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

	const tone = $derived(normalizeIntent(intent));
	const signal = $derived(signalLabel(signalType));
	const band = $derived(confidenceBand(confidence));
	const window_ = $derived(formatWindow(windowStart, windowEnd));
	const themeList: Theme[] = $derived(
		Array.isArray(themes)
			? themes.filter(
					(t): t is Theme => Boolean(t) && typeof t === 'object' && typeof t.label === 'string'
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
		{#if caseCount !== undefined}
			<div>
				<dt>cases</dt>
				<dd>{formatCount(caseCount)}</dd>
			</div>
		{/if}
		{#if window_}
			<div>
				<dt>window</dt>
				<dd>{window_}</dd>
			</div>
		{/if}
		{#if revenueAtRisk !== undefined}
			<div>
				<dt>at risk</dt>
				<dd class="risk">{formatMoney(revenueAtRisk, currency)}</dd>
			</div>
		{/if}
	</dl>

	{#if themeList.length > 0}
		<ul class="themes">
			{#each themeList as t (t.label)}
				<li>{t.label} <span class="count">{formatCount(t.count)}</span></li>
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
	.facts dd.risk {
		color: var(--auri-on-intent-warning-container);
	}

	.themes {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		margin: 0;
		padding: 0;
	}
	.themes li {
		font-size: var(--auri-type-caption-size);
		padding: 0.1rem 0.55rem;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-pill);
		color: var(--auri-on-surface-variant);
	}
	.themes .count {
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
