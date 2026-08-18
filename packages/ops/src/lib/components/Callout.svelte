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
	.auri-callout {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: 0.75rem var(--a2ui-space-inset);
		border: 1px solid var(--auri-intent-info-border);
		border-inline-start: 3px solid var(--auri-intent-info);
		border-radius: var(--a2ui-radius);
		background: var(--auri-intent-info-surface);
		color: var(--a2ui-color-text);
	}

	[data-intent='good'] {
		border-color: var(--auri-intent-good-border);
		border-inline-start-color: var(--auri-intent-good);
		background: var(--auri-intent-good-surface);
	}
	[data-intent='bad'] {
		border-color: var(--auri-intent-bad-border);
		border-inline-start-color: var(--auri-intent-bad);
		background: var(--auri-intent-bad-surface);
	}
	[data-intent='warning'] {
		border-color: var(--auri-intent-warning-border);
		border-inline-start-color: var(--auri-intent-warning);
		background: var(--auri-intent-warning-surface);
	}
	[data-intent='neutral'] {
		border-color: var(--auri-intent-neutral-border);
		border-inline-start-color: var(--auri-intent-neutral);
		background: var(--auri-intent-neutral-surface);
	}

	.title {
		margin: 0 0 0.25em;
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.text {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		overflow-wrap: anywhere;
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
		background: rgb(150 150 150 / 0.16);
		border-radius: var(--a2ui-radius-small);
		padding: 0.1em 0.3em;
	}
	.text :global(a) {
		color: var(--a2ui-color-primary);
	}
</style>
