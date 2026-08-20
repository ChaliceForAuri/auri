<script lang="ts">
	import { getRenderContext } from 'svelte-a2ui';
	import { surfaceValid } from '../checks.js';

	interface Props {
		/** Pre-built handlers — fire the wire actions as declared. */
		actions?: Record<string, () => void>;
		submitLabel?: unknown;
		cancelLabel?: unknown;
		pending?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let { actions, submitLabel, cancelLabel, pending, disabled, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();

	// The contract's gate: submission fires only when every check on the
	// surface passes. Reading client.state inside $derived keeps this live as
	// the user types (each binding write produces a new state).
	const surface = $derived(rc.client.state.surfaces[rc.surfaceId]);
	const valid = $derived(surface ? surfaceValid(surface, rc.catalog.functions) : true);

	const busy = $derived(pending === true);
	const hasCancel = $derived('cancelAction' in a2ui.spec);
	const blocked = $derived(!valid || busy || disabled === true);
</script>

<div class="auri-submitbar auri-enter" style:flex-grow={weight} aria-label={ariaLabel}>
	{#if hasCancel}
		<button type="button" class="cancel" disabled={busy} onclick={() => actions?.cancelAction?.()}>
			{cancelLabel ?? 'Cancel'}
		</button>
	{/if}
	<button
		type="button"
		class="submit"
		disabled={blocked}
		aria-busy={busy}
		onclick={() => actions?.submitAction?.()}
	>
		{#if busy}<span class="spinner" aria-hidden="true"></span>{/if}
		{submitLabel ?? 'Submit'}
	</button>
	<span class="auri-sr-only" aria-live="polite">{busy ? 'submitting' : ''}</span>
</div>

<style>
	.auri-submitbar {
		display: flex;
		justify-content: flex-end;
		align-items: center;
		gap: 0.5rem;
		margin: var(--a2ui-space-leaf);
	}

	button {
		font: inherit;
		font-weight: 500;
		font-size: 0.875rem;
		min-height: 2.25rem;
		padding: 0 1.1rem;
		border-radius: var(--auri-shape-md);
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		transition:
			background var(--auri-motion-fast) linear,
			opacity var(--auri-motion-fast) linear;
	}

	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	button:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}

	.submit {
		border: none;
		background: var(--auri-primary);
		color: var(--auri-on-primary);
	}
	.submit:not(:disabled):hover {
		background: color-mix(in oklab, var(--auri-primary) 88%, var(--auri-on-primary));
	}

	.cancel {
		border: 1px solid var(--auri-outline-variant);
		background: var(--auri-surface-container);
		color: var(--auri-on-surface-variant);
	}
	.cancel:not(:disabled):hover {
		color: var(--auri-on-surface);
		background: var(--auri-surface-container-high);
	}

	@keyframes auri-spin {
		to {
			transform: rotate(1turn);
		}
	}
	.spinner {
		width: 0.85rem;
		height: 0.85rem;
		border-radius: 50%;
		border: 2px solid color-mix(in oklab, var(--auri-on-primary) 35%, transparent);
		border-top-color: var(--auri-on-primary);
		animation: auri-spin 0.7s linear infinite;
	}
	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation-duration: 1.6s;
		}
	}
</style>
