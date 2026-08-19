<script lang="ts">
	import { normalizeSeries, niceCeil, sampleIndices } from '../chart.js';
	import { formatCellNumber, formatTimelineTime } from '../format.js';

	interface Props {
		kind?: unknown;
		label?: unknown;
		series?: unknown;
		xLabels?: unknown;
		xFormat?: unknown;
		unit?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { kind, label, series, xLabels, xFormat, unit, weight, ariaLabel }: Props = $props();

	const mark = $derived(kind === 'bar' || kind === 'area' ? kind : 'line');
	// undefined -> binding unresolved (skeleton); [] -> nothing to draw yet.
	const all = $derived(
		series === undefined || series === null ? undefined : normalizeSeries(series)
	);
	const labels = $derived(Array.isArray(xLabels) ? (xLabels as unknown[]).map(String) : []);

	/* Fixed stage; scales as an image. Text stays legible down to ~320px wide. */
	const W = 640;
	const H = 240;
	const M = { top: 10, right: 10, bottom: 26, left: 46 };
	const plotW = W - M.left - M.right;
	const plotH = H - M.top - M.bottom;

	const pointCount = $derived(all ? Math.max(0, ...all.map((s) => s.values.length)) : 0);
	const yTop = $derived(all ? niceCeil(Math.max(1e-9, ...all.flatMap((s) => s.values))) : 1);
	const yTicks = $derived(Array.from({ length: 5 }, (_, i) => (yTop / 4) * i));

	function x(i: number): number {
		if (pointCount <= 1) return M.left + plotW / 2;
		return M.left + (i / (pointCount - 1)) * plotW;
	}
	function y(v: number): number {
		return M.top + (1 - v / yTop) * plotH;
	}

	function linePoints(values: number[]): string {
		return values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
	}
	function areaPoints(values: number[]): string {
		if (values.length === 0) return '';
		return `${x(0).toFixed(1)},${y(0).toFixed(1)} ${linePoints(values)} ${x(values.length - 1).toFixed(1)},${y(0).toFixed(1)}`;
	}

	/* Bars: one band per category, series side by side inside it. */
	const band = $derived(pointCount > 0 ? plotW / pointCount : plotW);
	const group = $derived(band * 0.72);
	const barW = $derived(all && all.length > 0 ? group / all.length : group);

	const xTickIndices = $derived(sampleIndices(Math.max(pointCount, labels.length)));
	function xTickLabel(i: number): string {
		const raw = labels[i];
		if (raw === undefined) return String(i + 1);
		return xFormat === 'datetime' ? formatTimelineTime(raw) : raw;
	}

	const summary = $derived.by(() => {
		if (!all || all.length === 0) return 'no data yet';
		return all
			.map((s) => {
				const latest = s.values.at(-1);
				return `${s.label || 'series'} latest ${latest === undefined ? '—' : formatCellNumber(latest)}${typeof unit === 'string' ? ` ${unit}` : ''}`;
			})
			.join('; ');
	});

	function seriesColor(si: number): string {
		return `var(--auri-chart-${(si % 6) + 1})`;
	}
</script>

<figure
	class="auri-chart auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? `${String(label ?? 'chart')}: ${summary}`}
>
	<figcaption aria-hidden="true">
		{label}{#if typeof unit === 'string'}<span class="unit"> · {unit}</span>{/if}
	</figcaption>

	{#if !all}
		<span class="auri-skeleton chart-skeleton" aria-hidden="true"></span>
	{:else if all.length === 0 || pointCount === 0}
		<p class="empty">no data yet</p>
	{:else}
		<svg viewBox="0 0 {W} {H}" role="img" aria-label={summary}>
			{#each yTicks as tick (tick)}
				<line class="grid" x1={M.left} y1={y(tick)} x2={W - M.right} y2={y(tick)} />
				<text class="tick" x={M.left - 6} y={y(tick) + 3} text-anchor="end"
					>{formatCellNumber(tick)}</text
				>
			{/each}

			{#each all as s, si (si)}
				{#if mark === 'bar'}
					{#each s.values as v, i (i)}
						<rect
							class="mark"
							style:--series-color={seriesColor(si)}
							x={M.left + i * band + (band - group) / 2 + si * barW}
							y={y(v)}
							width={Math.max(1, barW - 1)}
							height={Math.max(0, M.top + plotH - y(v))}
							rx="1.5"
						/>
					{/each}
				{:else}
					{#if mark === 'area'}
						<polygon
							class="area"
							style:--series-color={seriesColor(si)}
							points={areaPoints(s.values)}
						/>
					{/if}
					<polyline
						class="line"
						style:--series-color={seriesColor(si)}
						points={linePoints(s.values)}
					/>
				{/if}
			{/each}

			<!-- Edge labels anchor inward so they never clip the stage. -->
			{#each xTickIndices as i, n (i)}
				<text
					class="tick"
					x={mark === 'bar' ? M.left + i * band + band / 2 : x(i)}
					y={H - 8}
					text-anchor={n === 0 ? 'start' : n === xTickIndices.length - 1 ? 'end' : 'middle'}
				>
					{xTickLabel(i)}
				</text>
			{/each}
		</svg>

		{#if all.length > 1}
			<div class="legend" aria-hidden="true">
				{#each all as s, si (si)}
					<span class="key" style:--series-color={seriesColor(si)}><i></i>{s.label}</span>
				{/each}
			</div>
		{/if}
	{/if}
</figure>

<style>
	/* Tonal: container surface, no border (DESIGN 1). */
	.auri-chart {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 1rem 1.25rem 0.75rem;
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
	}

	figcaption {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
		margin-bottom: 0.5rem;
	}
	figcaption .unit {
		font-weight: 400;
	}

	svg {
		display: block;
		width: 100%;
		height: auto;
	}

	.grid {
		stroke: var(--auri-outline-variant);
		stroke-width: 0.75;
	}

	.tick {
		fill: var(--auri-on-surface-variant);
		font-size: 10px;
		font-variant-numeric: tabular-nums;
	}
	.unit {
		font-size: 9px;
	}

	.line {
		fill: none;
		stroke: var(--series-color);
		stroke-width: 2;
		stroke-linejoin: round;
		stroke-linecap: round;
	}
	.area {
		fill: var(--series-color);
		opacity: 0.14;
		stroke: none;
	}
	.mark {
		fill: var(--series-color);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 1rem;
		margin-top: 0.4rem;
	}
	.key {
		display: inline-flex;
		align-items: center;
		gap: 0.4em;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}
	.key i {
		width: 0.7em;
		height: 0.7em;
		border-radius: 3px;
		background: var(--series-color);
	}

	.chart-skeleton {
		display: block;
		width: 100%;
		height: 12rem;
	}

	.empty {
		margin: 0;
		padding: 3rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: var(--auri-on-surface-variant);
	}
</style>
