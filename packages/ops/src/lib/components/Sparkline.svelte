<script lang="ts">
	import { normalizeIntent, sparklineSummary } from '../format.js';

	interface Props {
		label?: unknown;
		values?: unknown;
		intent?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, values, intent, weight, ariaLabel }: Props = $props();

	const tone = $derived(normalizeIntent(intent));
	const data = $derived(
		Array.isArray(values)
			? (values as unknown[]).filter(
					(v): v is number => typeof v === 'number' && Number.isFinite(v)
				)
			: undefined
	);

	const W = 120;
	const H = 32;
	const PAD = 3;

	const points = $derived.by(() => {
		if (!data || data.length === 0) return '';
		if (data.length === 1) return `${PAD},${H / 2} ${W - PAD},${H / 2}`;
		const min = Math.min(...data);
		const max = Math.max(...data);
		const span = max - min || 1;
		return data
			.map((v, i) => {
				const x = PAD + (i / (data.length - 1)) * (W - 2 * PAD);
				const y = PAD + (1 - (v - min) / span) * (H - 2 * PAD);
				return `${x.toFixed(1)},${y.toFixed(1)}`;
			})
			.join(' ');
	});

	const lastPoint = $derived(points ? points.split(' ').at(-1)!.split(',') : null);
	const summary = $derived(data ? sparklineSummary(data) : '');
</script>

{#if !data}
	<span class="auri-skeleton spark-skeleton" aria-hidden="true"></span>
{:else}
	<span class="auri-sparkline auri-enter" data-intent={tone} style:flex-grow={weight}>
		<svg
			viewBox="0 0 {W} {H}"
			role="img"
			aria-label={ariaLabel ?? `${String(label ?? 'trend')}: ${summary}`}
		>
			{#if data.length === 0}
				<line x1={PAD} y1={H / 2} x2={W - PAD} y2={H / 2} class="empty-line" />
			{:else}
				<polyline class="line" {points} />
				{#if lastPoint}
					<circle class="dot" cx={lastPoint[0]} cy={lastPoint[1]} r="2.5" />
				{/if}
			{/if}
		</svg>
		<span class="label">{label}</span>
	</span>
{/if}

<style>
	.auri-sparkline {
		display: inline-flex;
		align-items: center;
		gap: 0.5em;
		margin: var(--a2ui-space-leaf);
		min-width: 0;
	}

	svg {
		width: 7.5rem;
		height: 2rem;
		flex: none;
	}

	/* Intent picks the color through one custom prop — stroke/fill roles stay fixed. */
	.auri-sparkline {
		--spark-color: var(--auri-intent-neutral);
	}
	[data-intent='good'] {
		--spark-color: var(--auri-intent-good);
	}
	[data-intent='bad'] {
		--spark-color: var(--auri-intent-bad);
	}
	[data-intent='warning'] {
		--spark-color: var(--auri-intent-warning);
	}
	[data-intent='info'] {
		--spark-color: var(--auri-intent-info);
	}

	.line {
		fill: none;
		stroke: var(--spark-color);
		stroke-width: 1.5;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.dot {
		fill: var(--spark-color);
	}
	.empty-line {
		stroke: var(--auri-outline-variant);
		stroke-width: 1;
		stroke-dasharray: 3 3;
	}

	.label {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		overflow-wrap: anywhere;
	}

	.spark-skeleton {
		width: 7.5rem;
		height: 2rem;
		margin: var(--a2ui-space-leaf);
	}
</style>
