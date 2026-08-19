<script lang="ts">
	import { normalizeIntent } from '../format.js';

	interface Props {
		text?: unknown;
		intent?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { text, intent, weight, ariaLabel }: Props = $props();

	const tone = $derived(normalizeIntent(intent));
	const pending = $derived(text === undefined || text === null);
</script>

{#if pending}
	<span class="auri-skeleton badge-skeleton" aria-hidden="true"></span>
{:else}
	<span
		class="auri-badge auri-enter"
		data-intent={tone}
		style:flex-grow={weight}
		aria-label={ariaLabel}>{text}</span
	>
{/if}

<style>
	/* Foundation: soft tint + strong-color text — quiet chip, loud meaning. */
	.auri-badge {
		display: inline-flex;
		align-items: center;
		margin: var(--a2ui-space-leaf);
		padding: 0.22em 0.7em;
		border-radius: var(--auri-shape-sm);
		background: var(--auri-intent-neutral-container);
		color: var(--auri-on-intent-neutral-container);
		font-size: var(--auri-type-label-size);
		font-weight: 600;
		line-height: 1.55;
		white-space: nowrap;
		/* Intent flips through the data model cross-fade (DESIGN 4). */
		transition:
			background var(--auri-motion-fast) linear,
			color var(--auri-motion-fast) linear;
	}

	[data-intent='good'] {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	[data-intent='bad'] {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	[data-intent='warning'] {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	[data-intent='info'] {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}

	.badge-skeleton {
		width: 5ch;
		height: 1.8em;
		margin: var(--a2ui-space-leaf);
		border-radius: var(--auri-shape-sm);
	}
</style>
