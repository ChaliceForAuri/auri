<script lang="ts">
	import { getRenderContext } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import { describeVector, formatCount, normalizeIntent } from '../format.js';

	interface Point {
		id: string;
		label: string;
		x: number;
		y: number;
		dx: number;
		dy: number;
		intent?: string;
		weight?: number;
	}

	interface Props {
		label?: unknown;
		xLabel?: unknown;
		yLabel?: unknown;
		subjectKind?: unknown;
		points?: unknown;
		/** Registered `raw`: subject + point identity merged before dispatch. */
		pointAction?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let { label, xLabel, yLabel, subjectKind, points, pointAction, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();

	// undefined -> skeleton; [] -> designed empty.
	const raw: Point[] | undefined = $derived(
		Array.isArray(points)
			? (points as Point[]).filter(
					(p) =>
						p &&
						typeof p === 'object' &&
						typeof p.id === 'string' &&
						typeof p.x === 'number' &&
						typeof p.y === 'number'
				)
			: undefined
	);

	/* Keyboard traversal order is weight descending, not DOM order (issue #24):
	   the biggest account is the first thing a screen reader meets. */
	const ordered = $derived(
		raw ? [...raw].sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)) : undefined
	);

	/* Fixed stage, scales as an image. Domain covers points AND vector tips. */
	const W = 640;
	const H = 300;
	const M = { top: 14, right: 14, bottom: 42, left: 52 };
	const plotW = W - M.left - M.right;
	const plotH = H - M.top - M.bottom;

	function domain(values: number[]): [number, number] {
		const lo = Math.min(...values);
		const hi = Math.max(...values);
		const pad = (hi - lo || 1) * 0.15;
		return [lo - pad, hi + pad];
	}
	const xDom = $derived(
		raw && raw.length > 0 ? domain(raw.flatMap((p) => [p.x, p.x + p.dx])) : [0, 1]
	);
	const yDom = $derived(
		raw && raw.length > 0 ? domain(raw.flatMap((p) => [p.y, p.y + p.dy])) : [0, 1]
	);

	const sx = (v: number) => M.left + ((v - xDom[0]) / (xDom[1] - xDom[0])) * plotW;
	const sy = (v: number) => M.top + (1 - (v - yDom[0]) / (yDom[1] - yDom[0])) * plotH;

	const maxWeight = $derived(
		raw && raw.length > 0 ? Math.max(...raw.map((p) => p.weight ?? 0), 1) : 1
	);
	const r = (p: Point) => 5 + 9 * Math.sqrt((p.weight ?? 0) / maxWeight);

	/* The text alternative summarises the SHAPE, not the count (issue #24):
	   how many moving negatively, the largest by weight, the fastest mover. */
	const summary = $derived.by(() => {
		if (!ordered || ordered.length === 0) return 'no accounts yet';
		const falling = ordered.filter((p) => p.dy < 0);
		const largest = ordered[0]!;
		const fastest = [...ordered].sort(
			(a, b) => Math.hypot(b.dx, b.dy) - Math.hypot(a.dx, a.dy)
		)[0]!;
		const xl = String(xLabel ?? 'x');
		const yl = String(yLabel ?? 'y');
		return (
			`${formatCount(ordered.length)} ${String(subjectKind ?? 'account')}s; ` +
			`${formatCount(falling.length)} with ${yl.toLowerCase()} falling; ` +
			`largest: ${largest.label}; ` +
			`fastest mover: ${fastest.label}, ${describeVector(fastest.dx, fastest.dy, xl, yl)}`
		);
	});

	const interactive = $derived(Boolean(pointAction) && typeof pointAction === 'object');
	let cursor = $state<number | null>(null);

	function activate(p: Point) {
		if (!interactive) return;
		rc.client.dispatch(
			rc.surfaceId,
			withSubject(pointAction as Action, {
				subjectKind: subjectKind ?? 'account',
				subjectId: p.id,
				pointLabel: p.label,
				x: p.x,
				y: p.y
			}),
			a2ui.id,
			a2ui.scope
		);
	}

	function onKey(e: KeyboardEvent) {
		if (!interactive || !ordered || ordered.length === 0) return;
		const c = cursor ?? -1;
		if (e.key === 'ArrowRight' || e.key === 'ArrowDown')
			cursor = Math.min(c + 1, ordered.length - 1);
		else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') cursor = Math.max(c - 1, 0);
		else if ((e.key === 'Enter' || e.key === ' ') && cursor !== null) activate(ordered[cursor]!);
		else return;
		e.preventDefault();
	}

	const cursorText = $derived.by(() => {
		if (cursor === null || !ordered) return '';
		const p = ordered[cursor];
		if (!p) return '';
		return `${p.label}: ${describeVector(p.dx, p.dy, String(xLabel ?? 'x'), String(yLabel ?? 'y'))}`;
	});

	/* Vector arrows: scaled so momentum reads without dominating. */
	const VSCALE = 1;
	function arrow(p: Point): { x1: number; y1: number; x2: number; y2: number } {
		return { x1: sx(p.x), y1: sy(p.y), x2: sx(p.x + p.dx * VSCALE), y2: sy(p.y + p.dy * VSCALE) };
	}
</script>

<figure
	class="auri-scatter auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? `${String(label ?? 'scatter')}: ${summary}`}
>
	<figcaption aria-hidden="true">{label}</figcaption>

	{#if !ordered}
		<span class="auri-skeleton stage-skeleton" aria-hidden="true"></span>
	{:else if ordered.length === 0}
		<p class="empty">no accounts yet</p>
	{:else}
		<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
		<!-- tabindex and role travel together: 0 + application when pointAction
		     is declared, undefined + img otherwise. -->
		<svg
			viewBox="0 0 {W} {H}"
			role={interactive ? 'application' : 'img'}
			aria-label={interactive
				? `${summary}. Arrow keys move between accounts by size, Enter drills in.`
				: summary}
			tabindex={interactive ? 0 : undefined}
			onkeydown={interactive ? onKey : undefined}
			onfocus={() => {
				if (interactive && cursor === null) cursor = 0;
			}}
			onblur={() => (cursor = null)}
		>
			<defs>
				<marker
					id="{a2ui.id}-arrow"
					viewBox="0 0 8 8"
					refX="7"
					refY="4"
					markerWidth="5"
					markerHeight="5"
					orient="auto"
				>
					<path d="M0 0 L8 4 L0 8 Z" fill="context-stroke" />
				</marker>
			</defs>

			<line class="axis" x1={M.left} y1={M.top + plotH} x2={W - M.right} y2={M.top + plotH} />
			<line class="axis" x1={M.left} y1={M.top} x2={M.left} y2={M.top + plotH} />
			<text class="axis-label" x={M.left + plotW / 2} y={H - 8} text-anchor="middle">{xLabel}</text>
			<text
				class="axis-label"
				x={12}
				y={M.top + plotH / 2}
				text-anchor="middle"
				transform="rotate(-90 12 {M.top + plotH / 2})">{yLabel}</text
			>

			{#each ordered as p, i (p.id)}
				{@const a = arrow(p)}
				<g class="point" data-intent={normalizeIntent(p.intent)}>
					{#if p.dx !== 0 || p.dy !== 0}
						<line
							class="vector"
							x1={a.x1}
							y1={a.y1}
							x2={a.x2}
							y2={a.y2}
							marker-end="url(#{a2ui.id}-arrow)"
						/>
					{/if}
					<!-- svelte-ignore a11y_no_static_element_interactions -->
					<circle
						class="dot"
						class:clickable={interactive}
						aria-hidden="true"
						cx={sx(p.x)}
						cy={sy(p.y)}
						r={r(p)}
						onclick={() => activate(p)}
					/>
					{#if cursor === i}
						<circle class="cursor-ring" cx={sx(p.x)} cy={sy(p.y)} r={r(p) + 4} />
					{/if}
					<text class="dot-label" x={sx(p.x)} y={sy(p.y) - r(p) - 5} text-anchor="middle"
						>{p.label}</text
					>
				</g>
			{/each}
		</svg>
		{#if interactive}
			<span class="auri-sr-only" aria-live="polite">{cursorText}</span>
		{/if}
	{/if}
</figure>

<style>
	.auri-scatter {
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

	svg {
		display: block;
		width: 100%;
		height: auto;
	}
	svg:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
		border-radius: var(--auri-shape-sm);
	}

	.axis {
		stroke: var(--auri-outline-variant);
		stroke-width: 1;
	}
	.axis-label {
		fill: var(--auri-on-surface-variant);
		font-size: 10px;
	}

	.dot {
		fill: var(--auri-on-surface-variant);
		opacity: 0.85;
	}
	.dot.clickable {
		cursor: pointer;
	}
	[data-intent='bad'] .dot {
		fill: var(--auri-intent-bad);
	}
	[data-intent='warning'] .dot {
		fill: var(--auri-intent-warning);
	}
	[data-intent='good'] .dot {
		fill: var(--auri-intent-good);
	}
	[data-intent='info'] .dot {
		fill: var(--auri-intent-info);
	}

	.vector {
		stroke: var(--auri-on-surface-variant);
		stroke-width: 1.5;
		opacity: 0.7;
	}
	[data-intent='bad'] .vector {
		stroke: var(--auri-intent-bad);
	}
	[data-intent='warning'] .vector {
		stroke: var(--auri-intent-warning);
	}
	[data-intent='good'] .vector {
		stroke: var(--auri-intent-good);
	}

	.dot-label {
		fill: var(--auri-on-surface-variant);
		font-size: 10px;
	}

	.cursor-ring {
		fill: none;
		stroke: var(--auri-primary);
		stroke-width: 2;
		pointer-events: none;
	}

	.stage-skeleton {
		display: block;
		width: 100%;
		height: 14rem;
	}

	.empty {
		margin: 0;
		padding: 3rem 0;
		text-align: center;
		font-size: 0.875rem;
		color: var(--auri-on-surface-variant);
	}
</style>
