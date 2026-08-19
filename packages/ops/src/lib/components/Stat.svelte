<script lang="ts">
	import { formatStatValue, formatDelta, normalizeIntent } from '../format.js';

	interface Props {
		label?: unknown;
		value?: unknown;
		unit?: unknown;
		delta?: unknown;
		caption?: unknown;
		trend?: unknown;
		intent?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, value, unit, delta, caption, trend, intent, weight, ariaLabel }: Props = $props();

	const tone = $derived(normalizeIntent(intent));
	const unitStr = $derived(typeof unit === 'string' ? unit : undefined);
	// Unresolved binding (data hasn't arrived) -> skeleton, exact final height.
	const pending = $derived(value === undefined || value === null);
	const v = $derived(formatStatValue(value, unitStr));
	const d = $derived(typeof delta === 'number' ? formatDelta(delta, unitStr) : null);

	const TREND_GLYPHS: Record<string, string> = { up: '↗', down: '↘', flat: '→' };
	const trendGlyph = $derived(typeof trend === 'string' ? TREND_GLYPHS[trend] : undefined);
</script>

<div
	class="auri-stat auri-enter"
	data-intent={tone}
	style:flex-grow={weight}
	role="group"
	aria-label={ariaLabel ?? String(label ?? '')}
>
	<span class="label">{label}</span>
	{#if pending}
		<span class="auri-skeleton value-skeleton" aria-hidden="true"></span>
	{:else}
		<span class="value"
			>{v.text}{#if v.unitText}<span class="unit">{v.unitText}</span>{/if}</span
		>
	{/if}
	{#if trendGlyph || d || caption}
		<span class="meta">
			{#if trendGlyph || d}
				<!-- The delta chip: judgment as a filled tonal pill (DESIGN 2, Tonal). -->
				<span class="chip">
					{#if trendGlyph}
						<span aria-hidden="true">{trendGlyph}</span>
						<span class="auri-sr-only">trending {trend}</span>
					{/if}
					{#if d}{d}{/if}
				</span>
			{/if}
			{#if caption}<span class="caption">{caption}</span>{/if}
		</span>
	{/if}
</div>

<style>
	.auri-stat {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 1.125rem 1.25rem;
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
	}

	.label {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
		overflow-wrap: anywhere;
	}

	.value {
		font-size: var(--auri-type-value-size);
		font-weight: var(--auri-type-value-weight);
		letter-spacing: -0.02em;
		color: var(--auri-on-surface);
		line-height: 1.12;
		/* Streaming values must not jiggle their neighbours (DESIGN 3). */
		font-variant-numeric: tabular-nums;
	}

	.value-skeleton {
		/* Same box the value line would occupy — the skeleton is the CLS reservation. */
		width: 5.5ch;
		height: calc(var(--auri-type-value-size) * 1.12);
	}

	.unit {
		margin-inline-start: 0.25em;
		font-size: 0.5em;
		font-weight: 500;
		letter-spacing: 0;
		color: var(--auri-on-surface-variant);
	}

	.meta {
		display: flex;
		align-items: center;
		gap: 0.55em;
		font-size: var(--auri-type-caption-size);
		font-variant-numeric: tabular-nums;
	}

	.chip {
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
		font-weight: 600;
		padding: 0.15em 0.75em;
		border-radius: var(--auri-shape-pill);
		background: var(--auri-intent-neutral-container);
		color: var(--auri-on-intent-neutral-container);
		/* Intent flips through the data model cross-fade (DESIGN 4). */
		transition:
			background var(--auri-motion-fast) linear,
			color var(--auri-motion-fast) linear;
	}
	[data-intent='good'] .chip {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	[data-intent='bad'] .chip {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	[data-intent='warning'] .chip {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	[data-intent='info'] .chip {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}

	.caption {
		color: var(--auri-on-surface-variant);
	}
</style>
