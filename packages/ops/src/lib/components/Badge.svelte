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
		aria-label={ariaLabel}
	>
		<span class="dot" aria-hidden="true"></span>{text}
	</span>
{/if}

<style>
	.auri-badge {
		display: inline-flex;
		align-items: center;
		gap: 0.35em;
		margin: var(--a2ui-space-leaf);
		padding: 0.15em 0.6em;
		border: 1px solid var(--auri-intent-neutral-border);
		border-radius: 999px;
		background: var(--auri-intent-neutral-surface);
		color: var(--a2ui-color-text);
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		line-height: 1.6;
		white-space: nowrap;
	}

	.dot {
		width: 0.45em;
		height: 0.45em;
		border-radius: 50%;
		background: var(--auri-intent-neutral);
		/* Intent flips (via data binding) cross-fade — micro state change (DESIGN 4). */
		transition: background var(--auri-motion-fast) linear;
	}

	[data-intent='good'] {
		border-color: var(--auri-intent-good-border);
		background: var(--auri-intent-good-surface);
	}
	[data-intent='good'] .dot {
		background: var(--auri-intent-good);
	}
	[data-intent='bad'] {
		border-color: var(--auri-intent-bad-border);
		background: var(--auri-intent-bad-surface);
	}
	[data-intent='bad'] .dot {
		background: var(--auri-intent-bad);
	}
	[data-intent='warning'] {
		border-color: var(--auri-intent-warning-border);
		background: var(--auri-intent-warning-surface);
	}
	[data-intent='warning'] .dot {
		background: var(--auri-intent-warning);
	}
	[data-intent='info'] {
		border-color: var(--auri-intent-info-border);
		background: var(--auri-intent-info-surface);
	}
	[data-intent='info'] .dot {
		background: var(--auri-intent-info);
	}

	.badge-skeleton {
		width: 5ch;
		height: 1.6em;
		margin: var(--a2ui-space-leaf);
		border-radius: 999px;
	}
</style>
