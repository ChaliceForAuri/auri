<script lang="ts">
	import { getRenderContext, isEventAction } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope } from 'svelte-a2ui';
	import { normalizeSeries, niceCeil, sampleIndices } from '../chart.js';
	import { formatCellNumber, formatTimelineTime } from '../format.js';

	interface Marker {
		pointIndex: number;
		intent?: string;
		label: string;
	}

	interface Props {
		kind?: unknown;
		label?: unknown;
		series?: unknown;
		xLabels?: unknown;
		xFormat?: unknown;
		unit?: unknown;
		markers?: unknown;
		/** Registered `raw`: arrives as the wire Action so point context can be merged in. */
		pointAction?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let {
		kind,
		label,
		series,
		xLabels,
		xFormat,
		unit,
		markers,
		pointAction,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

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

	/* Markers (issue #18): labelled, intent-implied glyphs on an x position.
	   Out-of-range indices are dropped with a warning — never a floating mark. */
	const markList: Marker[] = $derived.by(() => {
		if (!Array.isArray(markers) || pointCount === 0) return [];
		const valid: Marker[] = [];
		for (const m of markers as Marker[]) {
			if (!m || typeof m !== 'object' || typeof m.label !== 'string') continue;
			if (typeof m.pointIndex !== 'number' || m.pointIndex < 0 || m.pointIndex >= pointCount) {
				console.warn(`[auri] Chart marker pointIndex ${m?.pointIndex} out of range, dropped`);
				continue;
			}
			valid.push(m);
		}
		return valid;
	});
	const markerColor = (m: Marker) =>
		`var(--auri-intent-${['good', 'bad', 'warning', 'info', 'neutral'].includes(m.intent ?? '') ? m.intent : 'warning'})`;
	const markX = (i: number) => (mark === 'bar' ? M.left + i * band + band / 2 : x(i));

	const summary = $derived.by(() => {
		if (!all || all.length === 0) return 'no data yet';
		const seriesPart = all
			.map((s) => {
				const latest = s.values.at(-1);
				return `${s.label || 'series'} latest ${latest === undefined ? '—' : formatCellNumber(latest)}${typeof unit === 'string' ? ` ${unit}` : ''}`;
			})
			.join('; ');
		// Markers join the text alternative: they exist to be read, not just seen.
		const markerPart = markList
			.map((m) => `marked ${xTickLabel(m.pointIndex)}: ${m.label}`)
			.join('; ');
		return markerPart ? `${seriesPart}; ${markerPart}` : seriesPart;
	});

	function seriesColor(si: number): string {
		return `var(--auri-chart-${(si % 6) + 1})`;
	}

	/* pointAction (issue #18): one tab stop, arrow-key traversal, Enter/Space
	   activates. The documented contract: seriesLabel, pointIndex, xLabel, and
	   value are merged into the action context; xLabel is the RAW wire label
	   (an ISO string under xFormat datetime) — raw values on the wire both ways. */
	const interactive = $derived(Boolean(pointAction) && typeof pointAction === 'object');
	let cursor = $state<{ si: number; pi: number } | null>(null);

	function clampCursor(si: number, pi: number) {
		if (!all || all.length === 0 || pointCount === 0) return;
		const s = Math.max(0, Math.min(si, all.length - 1));
		const p = Math.max(0, Math.min(pi, (all[s]?.values.length ?? 1) - 1));
		cursor = { si: s, pi: p };
	}

	function activate(si: number, pi: number) {
		if (!interactive || !all) return;
		const action = pointAction as Action;
		const merged: Action = isEventAction(action)
			? {
					event: {
						...action.event,
						context: {
							...(action.event.context ?? {}),
							seriesLabel: all[si]?.label ?? '',
							pointIndex: pi,
							xLabel: labels[pi] ?? String(pi + 1),
							value: all[si]?.values[pi]
						}
					}
				}
			: action;
		rc.client.dispatch(rc.surfaceId, merged, a2ui.id, a2ui.scope);
	}

	function onKey(e: KeyboardEvent) {
		if (!interactive || !all || all.length === 0) return;
		const c = cursor ?? { si: 0, pi: -1 };
		if (e.key === 'ArrowRight') clampCursor(c.si, c.pi + 1);
		else if (e.key === 'ArrowLeft') clampCursor(c.si, Math.max(0, c.pi - 1));
		else if (e.key === 'ArrowDown') clampCursor(c.si + 1, Math.max(0, c.pi));
		else if (e.key === 'ArrowUp') clampCursor(c.si - 1, Math.max(0, c.pi));
		else if ((e.key === 'Enter' || e.key === ' ') && cursor) activate(cursor.si, cursor.pi);
		else return;
		e.preventDefault();
	}

	const cursorText = $derived.by(() => {
		if (!cursor || !all) return '';
		const s = all[cursor.si];
		const v = s?.values[cursor.pi];
		return `${xTickLabel(cursor.pi)}: ${v === undefined ? '—' : formatCellNumber(v)}${typeof unit === 'string' ? ` ${unit}` : ''}, ${s?.label ?? ''}`;
	});
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
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- tabindex and role travel together: 0 + application when pointAction
		     is declared, undefined + img otherwise — static analysis can't pair
		     the two conditionals. -->
		<svg
			viewBox="0 0 {W} {H}"
			role={interactive ? 'application' : 'img'}
			aria-label={interactive
				? `${summary}. Arrow keys move between points, Enter drills in.`
				: summary}
			tabindex={interactive ? 0 : undefined}
			onkeydown={interactive ? onKey : undefined}
			onfocus={() => {
				if (interactive && !cursor) clampCursor(0, 0);
			}}
			onblur={() => (cursor = null)}
		>
			{#each yTicks as tick (tick)}
				<line class="grid" x1={M.left} y1={y(tick)} x2={W - M.right} y2={y(tick)} />
				<text class="tick" x={M.left - 6} y={y(tick) + 3} text-anchor="end"
					>{formatCellNumber(tick)}</text
				>
			{/each}

			{#each markList as m (m.pointIndex + m.label)}
				<line
					class="marker-guide"
					style:--marker-color={markerColor(m)}
					x1={markX(m.pointIndex)}
					y1={M.top}
					x2={markX(m.pointIndex)}
					y2={M.top + plotH}
				/>
				<path
					class="marker-glyph"
					style:--marker-color={markerColor(m)}
					d="M {markX(m.pointIndex)} {M.top} l 5 -7 h -10 Z"
				>
					<title>{m.label}</title>
				</path>
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

			{#if interactive}
				<!-- Pointer hit targets only: the keyboard path is the svg's own
				     roving cursor (arrows + Enter), so these are hidden from AT. -->
				{#each all as s, si (si)}
					{#each s.values as v, pi (pi)}
						<!-- svelte-ignore a11y_no_static_element_interactions -->
						<circle
							class="hit"
							aria-hidden="true"
							cx={mark === 'bar' ? M.left + pi * band + band / 2 : x(pi)}
							cy={mark === 'bar' ? y(v / 2) : y(v)}
							r="11"
							onclick={() => activate(si, pi)}
						/>
					{/each}
				{/each}
				{#if cursor && all[cursor.si]?.values[cursor.pi] !== undefined}
					<circle
						class="cursor-ring"
						cx={markX(cursor.pi)}
						cy={mark === 'bar'
							? y(all[cursor.si]!.values[cursor.pi]!)
							: y(all[cursor.si]!.values[cursor.pi]!)}
						r="7"
					/>
				{/if}
			{/if}
		</svg>
		{#if interactive}
			<span class="auri-sr-only" aria-live="polite">{cursorText}</span>
		{/if}

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
	/* Foundation: card + hairline. */
	.auri-chart {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 1rem 1.125rem 0.75rem;
		border: 1px solid var(--auri-outline-variant);
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

	.marker-guide {
		stroke: var(--marker-color);
		stroke-width: 1.25;
		stroke-dasharray: 3 3;
		opacity: 0.7;
	}
	.marker-glyph {
		fill: var(--marker-color);
	}

	.hit {
		fill: transparent;
		cursor: pointer;
	}
	.cursor-ring {
		fill: none;
		stroke: var(--auri-primary);
		stroke-width: 2;
		pointer-events: none;
	}
	svg:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
		border-radius: var(--auri-shape-sm);
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
