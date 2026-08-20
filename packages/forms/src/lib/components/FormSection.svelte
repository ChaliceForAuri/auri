<script lang="ts">
	import { Slot, type SlotContent } from 'svelte-a2ui';

	interface Props {
		slots: Record<string, SlotContent>;
		title?: unknown;
		description?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { slots, title, description, weight, ariaLabel }: Props = $props();
</script>

<section class="auri-section auri-enter" style:flex-grow={weight} aria-label={ariaLabel}>
	<header>
		<h3>{title}</h3>
		{#if description}<p>{description}</p>{/if}
	</header>
	<div class="fields">
		<Slot content={slots.children} />
	</div>
</section>

<style>
	.auri-section {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin: var(--a2ui-space-leaf);
		min-width: 0;
	}

	header {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}

	h3 {
		margin: 0;
		font-size: 0.9375rem;
		font-weight: 600;
		letter-spacing: -0.01em;
		color: var(--auri-on-surface);
	}

	p {
		margin: 0;
		font-size: var(--auri-type-caption-size);
		line-height: 1.5;
		color: var(--auri-on-surface-variant);
	}

	.fields {
		display: flex;
		flex-direction: column;
	}
</style>
