<script lang="ts">
	import { getRenderContext } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import { formatCount, formatWindow, normalizeIntent } from '../format.js';
	import { layoutTreemap, type TreemapInput } from '../treemap.js';

	interface Item {
		id: string;
		label: string;
		value: number;
		intent?: string;
		trend?: string;
		children?: Item[];
	}

	interface Props {
		label?: unknown;
		valueLabel?: unknown;
		subjectKind?: unknown;
		windowStart?: unknown;
		windowEnd?: unknown;
		items?: unknown;
		/** Registered `raw`: subject (+ parentId) merged before dispatch. */
		itemAction?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let {
		label,
		valueLabel,
		subjectKind,
		windowStart,
		windowEnd,
		items,
		itemAction,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

	/*
	 * Layout runs in a fixed 800x500 space and the result is positioned in
	 * percentages, inside a container pinned to the same 8:5 aspect. Nothing is
	 * measured: the ratios the squarifier optimises are exactly the ratios that
	 * render, at any width, and text stays at its own CSS size instead of
	 * scaling with the box the way SVG text would.
	 */
	const W = 800;
	const H = 500;
	const PAD = 4;
	const HEADER = 26;

	// undefined -> binding unresolved (skeleton); [] -> designed empty.
	/*
	 * Unlike InsightCard's metrics, an item with no finite value genuinely cannot
	 * be laid out — area IS the encoding, and there is no area for `undefined`.
	 * So dropping is right; dropping SILENTLY is not. An unresolved `{"path"}`
	 * would otherwise remove a region from the topography with no trace, and the
	 * map would look complete while being wrong.
	 */
	const list: Item[] | undefined = $derived.by(() => {
		if (!Array.isArray(items)) return undefined;
		const kept = (items as Item[]).filter(
			(i) => i && typeof i === 'object' && typeof i.id === 'string' && Number.isFinite(i.value)
		);
		if (kept.length !== items.length) {
			console.warn(
				`[auri] Treemap dropped ${items.length - kept.length} item(s) with a missing or ` +
					`non-finite value; area cannot encode them. Check the bindings behind them.`
			);
		}
		return kept;
	});

	const byId = $derived(
		new Map<string, { item: Item; parent?: Item }>(
			(list ?? []).flatMap((item) => [
				[item.id, { item }] as const,
				...(item.children ?? []).map((kid) => [kid.id, { item: kid, parent: item }] as const)
			])
		)
	);

	const rects = $derived(
		list ? layoutTreemap(list as unknown as TreemapInput[], W, H, PAD, HEADER) : []
	);

	const unit = $derived(typeof valueLabel === 'string' ? valueLabel : '');
	const period = $derived(formatWindow(windowStart, windowEnd));
	const kind = $derived(typeof subjectKind === 'string' && subjectKind ? subjectKind : 'area');
	const interactive = $derived(Boolean(itemAction) && typeof itemAction === 'object');

	/** A rect earns a label only if the text can sit in it without clipping. */
	const labelled = (w: number, h: number) => w >= 90 && h >= 34;
	const detailed = (w: number, h: number) => w >= 120 && h >= 58;

	function describe(item: Item, parent?: Item): string {
		const where = parent ? `${item.label}, in ${parent.label}` : item.label;
		const trend =
			item.trend === 'up'
				? ', rising'
				: item.trend === 'down'
					? ', falling'
					: item.trend === 'flat'
						? ', flat'
						: '';
		return `${where}: ${formatCount(item.value)} ${unit}${trend}`.trim();
	}

	function drill(id: string) {
		if (!interactive) return;
		const found = byId.get(id);
		if (!found) return;
		rc.client.dispatch(
			rc.surfaceId,
			withSubject(itemAction as Action, {
				subjectKind: kind,
				subjectId: found.item.id,
				itemLabel: found.item.label,
				...(found.parent ? { parentId: found.parent.id } : {})
			}),
			a2ui.id,
			a2ui.scope
		);
	}
</script>

<section
	class="auri-treemap auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? String(label ?? '')}
>
	<header>
		<h3>{label}</h3>
		{#if unit || period}
			<p class="meta">{[unit ? `by ${unit}` : '', period].filter(Boolean).join(' · ')}</p>
		{/if}
	</header>

	{#if !list}
		<div class="plot" aria-hidden="true">
			{#each [[0, 0, 58, 100], [58, 0, 42, 55], [58, 55, 42, 45]] as [x, y, w, h], i (i)}
				<span
					class="auri-skeleton cell-skeleton"
					style:left="{x}%"
					style:top="{y}%"
					style:width="{w}%"
					style:height="{h}%"
				></span>
			{/each}
		</div>
	{:else if list.length === 0}
		<p class="empty">nothing to show for this period</p>
	{:else}
		<div class="plot">
			{#each rects as rect (rect.id)}
				{@const found = byId.get(rect.id)}
				{#if found}
					{@const item = found.item}
					{@const w = (rect.width / W) * 100}
					{@const h = (rect.height / H) * 100}
					<svelte:element
						this={interactive ? 'button' : 'div'}
						type={interactive ? 'button' : undefined}
						class="cell"
						role={interactive ? 'button' : undefined}
						class:parent={rect.depth === 0 && (item.children?.length ?? 0) > 0}
						class:child={rect.depth === 1}
						data-intent={normalizeIntent(item.intent)}
						data-trend={item.trend ?? 'none'}
						style:left="{(rect.x / W) * 100}%"
						style:top="{(rect.y / H) * 100}%"
						style:width="{w}%"
						style:height="{h}%"
						aria-label={describe(item, found.parent)}
						onclick={interactive ? () => drill(rect.id) : undefined}
					>
						{#if labelled(rect.width, rect.height)}
							<span class="name">{item.label}</span>
							{#if detailed(rect.width, rect.height) && !(rect.depth === 0 && (item.children?.length ?? 0) > 0)}
								<span class="value">
									{formatCount(item.value)}
									{#if item.trend && item.trend !== 'flat'}
										<span class="trend" aria-hidden="true">{item.trend === 'up' ? '↑' : '↓'}</span>
									{/if}
								</span>
							{/if}
						{/if}
					</svelte:element>
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	.auri-treemap {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
	}

	header {
		margin-bottom: 0.5rem;
	}

	h3 {
		margin: 0;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}

	.meta {
		margin: 0.1rem 0 0;
		font-size: var(--auri-type-caption-size, 0.75rem);
		color: var(--auri-on-surface-variant);
		opacity: 0.8;
	}

	/* The layout space is 800x500; pinning the same ratio makes the squarifier's
	   aspect ratios the ones that actually render. */
	.plot {
		position: relative;
		aspect-ratio: 8 / 5;
		width: 100%;
	}

	.cell,
	.cell-skeleton {
		position: absolute;
		border-radius: var(--auri-shape-xs, 4px);
	}

	.cell {
		font: inherit;
		text-align: start;
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
		overflow: hidden;
		padding: 0.3rem 0.4rem;
		border: none;
		background: var(--auri-intent-neutral-container, var(--auri-surface-container-high));
		color: var(--auri-on-surface);
		transition: filter var(--auri-motion-fast, 120ms) var(--auri-motion-ease, ease);
	}

	button.cell {
		cursor: pointer;
	}

	button.cell:hover,
	button.cell:focus-visible {
		filter: brightness(1.06);
	}

	button.cell:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: -2px;
	}

	/* A parent shows only through its frame and header band — the children
	   cover the rest — so it carries its intent without competing with them. */
	.cell.parent {
		font-weight: 600;
	}

	.cell[data-intent='good'] {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	.cell[data-intent='bad'] {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	.cell[data-intent='warning'] {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	.cell[data-intent='info'] {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}

	.name {
		font-size: var(--auri-type-caption-size, 0.75rem);
		font-weight: 600;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.value {
		font-size: var(--auri-type-caption-size, 0.75rem);
		font-variant-numeric: tabular-nums;
		opacity: 0.85;
	}

	.trend {
		font-size: 0.9em;
	}

	.empty {
		margin: 0;
		font-size: var(--auri-type-caption-size, 0.75rem);
		color: var(--auri-on-surface-variant);
	}

	@media (prefers-reduced-motion: reduce) {
		.cell {
			transition: none;
		}
	}
</style>
