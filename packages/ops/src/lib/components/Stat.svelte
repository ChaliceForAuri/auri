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
			{#if trendGlyph}
				<span class="trend" aria-hidden="true">{trendGlyph}</span>
				<span class="auri-sr-only">trending {trend}</span>
			{/if}
			{#if d}<span class="delta">{d}</span>{/if}
			{#if caption}<span class="caption">{caption}</span>{/if}
		</span>
	{/if}
</div>

<style>
	.auri-stat {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: var(--a2ui-space-inset);
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
	}

	.label {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--a2ui-color-text-muted);
		overflow-wrap: anywhere;
	}

	.value {
		font-size: var(--auri-type-value-size);
		font-weight: var(--auri-type-value-weight);
		color: var(--a2ui-color-text);
		line-height: 1.15;
		/* Streaming values must not jiggle their neighbours (DESIGN 3). */
		font-variant-numeric: tabular-nums;
	}

	.value-skeleton {
		/* Same box the value line would occupy — the skeleton is the CLS reservation. */
		width: 5.5ch;
		height: calc(var(--auri-type-value-size) * 1.15);
	}

	.unit {
		margin-inline-start: 0.25em;
		font-size: 0.55em;
		font-weight: var(--auri-type-label-weight);
		color: var(--a2ui-color-text-muted);
	}

	.meta {
		display: flex;
		align-items: baseline;
		gap: 0.4em;
		font-size: var(--auri-type-caption-size);
		font-variant-numeric: tabular-nums;
	}

	/* Judgment colors the movement, not the tile (DESIGN 2: accents on neutral ground). */
	.trend,
	.delta {
		font-weight: 600;
	}
	[data-intent='good'] :is(.trend, .delta) {
		color: var(--auri-intent-good);
	}
	[data-intent='bad'] :is(.trend, .delta) {
		color: var(--auri-intent-bad);
	}
	[data-intent='warning'] :is(.trend, .delta) {
		color: var(--auri-intent-warning);
	}
	[data-intent='info'] :is(.trend, .delta) {
		color: var(--auri-intent-info);
	}
	[data-intent='neutral'] :is(.trend, .delta) {
		color: var(--auri-intent-neutral);
	}

	.caption {
		color: var(--a2ui-color-text-muted);
	}
</style>
