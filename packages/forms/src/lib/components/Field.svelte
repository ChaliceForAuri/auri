<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { ValidationResult } from 'svelte-a2ui';

	interface Props {
		label?: unknown;
		hint?: unknown;
		/** Right-aligned metadata on the hint line, e.g. a character counter. */
		meta?: string;
		/** Fieldset semantics for multi-control fields (radio/checkbox groups). */
		group?: boolean;
		validation: ValidationResult;
		/** Errors surface only after the field was touched, never on first paint. */
		show: boolean;
		errorId: string;
		weight?: number;
		children: Snippet;
	}

	let {
		label,
		hint,
		meta,
		group = false,
		validation,
		show,
		errorId,
		weight,
		children
	}: Props = $props();

	const failed = $derived(show && !validation.valid);
</script>

{#snippet footer()}
	{#if failed}
		<ul class="errors" id={errorId}>
			{#each validation.errors as error, i (i)}
				<li>{error}</li>
			{/each}
		</ul>
	{:else if hint || meta}
		<span class="hintline">
			<span class="hint">{hint ?? ''}</span>
			{#if meta}<span class="meta">{meta}</span>{/if}
		</span>
	{/if}
{/snippet}

{#if group}
	<fieldset class="auri-field auri-enter" style:flex-grow={weight}>
		<legend class="label">{label}</legend>
		{@render children()}
		{@render footer()}
	</fieldset>
{:else}
	<label class="auri-field auri-enter" style:flex-grow={weight}>
		<span class="label">{label}</span>
		{@render children()}
		{@render footer()}
	</label>
{/if}

<style>
	.auri-field {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		border: none;
		padding: 0;
	}

	.label {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface);
	}

	/* A legend behaves like a caption element; make it flow like the label. */
	legend.label {
		padding: 0;
		margin-bottom: 0.3rem;
	}

	.hintline {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.hint,
	.meta {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}
	.meta {
		font-variant-numeric: tabular-nums;
	}

	.errors {
		list-style: none;
		margin: 0;
		padding: 0;
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
	}
	.errors li {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-intent-bad);
	}
</style>
