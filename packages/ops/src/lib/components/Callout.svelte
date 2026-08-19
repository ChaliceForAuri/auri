<script lang="ts">
	import { isPlainText, renderMarkdown } from 'svelte-a2ui/catalog/basic';
	import { normalizeIntent } from '../format.js';

	interface Props {
		title?: unknown;
		text?: unknown;
		intent?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { title, text, intent, weight, ariaLabel }: Props = $props();

	// A callout exists to call attention; informational is its resting state.
	const tone = $derived(normalizeIntent(intent, 'info'));
	const body = $derived(text === undefined || text === null ? '' : String(text));
	const plain = $derived(isPlainText(body));
	/** Spoken before the body so the register isn't color-only (DESIGN 7). */
	const spokenTone = $derived(tone === 'bad' ? 'problem' : tone === 'warning' ? 'warning' : null);
</script>

<div
	class="auri-callout auri-enter"
	data-intent={tone}
	style:flex-grow={weight}
	role="note"
	aria-label={ariaLabel}
>
	{#if spokenTone}<span class="auri-sr-only">{spokenTone}:</span>{/if}
	{#if title}<p class="title">{title}</p>{/if}
	{#if plain}
		<p class="text">{body}</p>
	{:else}
		<!-- renderMarkdown escapes first; same trust boundary as the renderer's Text. -->
		<div class="text">{@html renderMarkdown(body)}</div>
	{/if}
</div>

<style>
	/* Tonal: a filled container carries the register — no borders (DESIGN 1/2). */
	.auri-callout {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 0.95rem 1.25rem;
		border-radius: var(--auri-shape-lg);
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
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
	[data-intent='neutral'] {
		background: var(--auri-intent-neutral-container);
		color: var(--auri-on-intent-neutral-container);
	}

	.title {
		margin: 0 0 0.3em;
		font-weight: 700;
		font-size: 0.9375rem;
	}

	.text {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.55;
		overflow-wrap: anywhere;
		opacity: 0.92;
	}

	.text :global(p) {
		margin: 0 0 0.5em;
	}
	.text :global(p:last-child) {
		margin-bottom: 0;
	}
	.text :global(code) {
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.9em;
		/* Neutral gray at low alpha so the chip reads on light and dark tints alike. */
		background: rgb(150 150 150 / 0.18);
		border-radius: 6px;
		padding: 0.1em 0.3em;
	}
	.text :global(a) {
		color: inherit;
		font-weight: 600;
	}
</style>
