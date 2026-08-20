<script lang="ts">
	import { getRenderContext } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import { formatCount, normalizeIntent } from '../format.js';

	interface Cluster {
		id: string;
		label: string;
		size: number;
		intent?: string;
		reason: string;
	}

	interface Props {
		label?: unknown;
		clusters?: unknown;
		/** Registered `raw`: subject + reason merged before dispatch. */
		clusterAction?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let { label, clusters, clusterAction, weight, ariaLabel, a2ui }: Props = $props();

	const rc = getRenderContext();

	// undefined -> binding unresolved (skeleton); [] -> designed empty.
	const list: Cluster[] | undefined = $derived(
		Array.isArray(clusters)
			? [...(clusters as Cluster[])]
					.filter((c) => c && typeof c === 'object' && typeof c.id === 'string')
					.sort((a, b) => (b.size ?? 0) - (a.size ?? 0))
			: undefined
	);

	const interactive = $derived(Boolean(clusterAction) && typeof clusterAction === 'object');

	function drill(cluster: Cluster) {
		if (!interactive) return;
		rc.client.dispatch(
			rc.surfaceId,
			withSubject(clusterAction as Action, {
				subjectKind: 'cluster',
				subjectId: cluster.id,
				reason: cluster.reason
			}),
			a2ui.id,
			a2ui.scope
		);
	}
</script>

<section
	class="auri-clustermap auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? String(label ?? '')}
>
	<h3>{label}</h3>
	{#if !list}
		<div class="tiles" aria-hidden="true">
			{#each [0, 1, 2] as i (i)}
				<span class="auri-skeleton tile-skeleton"></span>
			{/each}
		</div>
	{:else if list.length === 0}
		<p class="empty">no clusters right now</p>
	{:else}
		<div class="tiles">
			{#each list as cluster (cluster.id)}
				{#if interactive}
					<!-- The reason is the point: it is what makes the group actionable. -->
					<button
						type="button"
						class="tile"
						data-intent={normalizeIntent(cluster.intent)}
						onclick={() => drill(cluster)}
					>
						<span class="size">{formatCount(cluster.size)}</span>
						<span class="name">{cluster.label}</span>
						<span class="reason">{cluster.reason}</span>
					</button>
				{:else}
					<div class="tile" data-intent={normalizeIntent(cluster.intent)}>
						<span class="size">{formatCount(cluster.size)}</span>
						<span class="name">{cluster.label}</span>
						<span class="reason">{cluster.reason}</span>
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</section>

<style>
	.auri-clustermap {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
	}

	h3 {
		margin: 0 0 0.5rem;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}

	.tiles {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.6rem;
	}

	.tile {
		font: inherit;
		text-align: start;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		padding: 0.85rem 1rem;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
		transition: border-color var(--auri-motion-fast) linear;
	}
	button.tile {
		cursor: pointer;
	}
	button.tile:hover {
		border-color: var(--auri-primary);
	}
	button.tile:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}

	.size {
		font-size: var(--auri-type-value-size);
		font-weight: var(--auri-type-value-weight);
		font-variant-numeric: tabular-nums;
		line-height: 1.1;
		color: var(--auri-on-surface);
	}
	[data-intent='bad'] .size {
		color: var(--auri-on-intent-bad-container);
	}
	[data-intent='warning'] .size {
		color: var(--auri-on-intent-warning-container);
	}
	[data-intent='good'] .size {
		color: var(--auri-on-intent-good-container);
	}

	.name {
		font-weight: 600;
		font-size: 0.9375rem;
		color: var(--auri-on-surface);
	}

	.reason {
		font-size: var(--auri-type-caption-size);
		line-height: 1.45;
		color: var(--auri-on-surface-variant);
	}

	.tile-skeleton {
		display: block;
		height: 5.5rem;
		border-radius: var(--auri-shape-lg);
	}

	.empty {
		margin: 0;
		padding: 1.5rem 0;
		font-size: 0.875rem;
		color: var(--auri-on-surface-variant);
	}
</style>
