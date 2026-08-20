<script lang="ts">
	import type { Binding } from 'svelte-a2ui';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { bindings, label, hint, disabled, weight, ariaLabel }: Props = $props();

	const binding = $derived(bindings.value);
	const on = $derived(binding?.value === true);
</script>

<div class="auri-toggle auri-enter" style:flex-grow={weight}>
	<label class="switchrow">
		<input
			type="checkbox"
			role="switch"
			checked={on}
			disabled={disabled === true}
			aria-label={ariaLabel}
			onchange={(e) => binding?.set(e.currentTarget.checked)}
		/>
		<span class="track" aria-hidden="true"><span class="thumb"></span></span>
		<span class="text">{label}</span>
	</label>
	{#if hint}<span class="hint">{hint}</span>{/if}
</div>

<style>
	.auri-toggle {
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
		margin: var(--a2ui-space-leaf);
	}

	.switchrow {
		display: inline-flex;
		align-items: center;
		gap: 0.6rem;
		cursor: pointer;
	}

	/* The native checkbox stays for semantics and focus; the track draws it. */
	.switchrow input {
		position: absolute;
		width: 1px;
		height: 1px;
		margin: -1px;
		opacity: 0;
	}

	.track {
		flex: none;
		width: 2.1rem;
		height: 1.2rem;
		border-radius: var(--auri-shape-pill);
		background: var(--auri-surface-container-high);
		border: 1px solid var(--auri-outline-variant);
		box-sizing: border-box;
		padding: 0.1rem;
		transition: background var(--auri-motion-fast) linear;
	}
	.thumb {
		display: block;
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		background: var(--auri-on-surface-variant);
		transition: transform var(--auri-motion-fast) var(--auri-ease-out);
	}

	.switchrow input:checked + .track {
		background: var(--auri-primary);
		border-color: transparent;
	}
	.switchrow input:checked + .track .thumb {
		background: var(--auri-on-primary);
		transform: translateX(0.9rem);
	}

	.switchrow input:focus-visible + .track {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}

	.switchrow input:disabled ~ * {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.text {
		font-size: 0.875rem;
		color: var(--auri-on-surface);
	}

	.hint {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}

	@media (prefers-reduced-motion: reduce) {
		.thumb {
			transition: none;
		}
	}
</style>
