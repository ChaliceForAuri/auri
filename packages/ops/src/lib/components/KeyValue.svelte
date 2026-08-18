<script lang="ts">
	import { formatKeyValue } from '../format.js';

	interface Pair {
		key?: unknown;
		value?: unknown;
	}

	interface Props {
		label?: unknown;
		items?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, items, weight, ariaLabel }: Props = $props();

	const pairs = $derived(
		Array.isArray(items)
			? (items as Pair[]).filter((pair) => Boolean(pair) && typeof pair === 'object')
			: undefined
	);
</script>

<div
	class="auri-keyvalue auri-enter"
	style:flex-grow={weight}
	role="group"
	aria-label={ariaLabel ?? (label ? String(label) : undefined)}
>
	{#if label}<p class="label">{label}</p>{/if}

	{#if !pairs}
		<dl aria-hidden="true">
			{#each [0, 1, 2] as i (i)}
				<dt><span class="auri-skeleton kv-skeleton"></span></dt>
				<dd><span class="auri-skeleton kv-skeleton"></span></dd>
			{/each}
		</dl>
	{:else if pairs.length === 0}
		<p class="empty">—</p>
	{:else}
		<dl>
			{#each pairs as pair, i (i)}
				<dt>{pair.key}</dt>
				<dd>{formatKeyValue(pair.value)}</dd>
			{/each}
		</dl>
	{/if}
</div>

<style>
	.auri-keyvalue {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
	}

	.label {
		margin: 0 0 0.4rem;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--a2ui-color-text-muted);
	}

	dl {
		display: grid;
		grid-template-columns: minmax(6rem, max-content) minmax(0, 1fr);
		gap: 0.3rem 1.25rem;
		margin: 0;
	}

	dt {
		font-size: 0.8125rem;
		color: var(--a2ui-color-text-muted);
	}

	dd {
		margin: 0;
		font-size: 0.8125rem;
		color: var(--a2ui-color-text);
		font-variant-numeric: tabular-nums;
		overflow-wrap: anywhere;
	}

	.kv-skeleton {
		width: 6ch;
		height: 0.8125rem;
	}

	.empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--a2ui-color-text-muted);
	}
</style>
