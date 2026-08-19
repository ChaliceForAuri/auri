<script lang="ts">
	import { normalizeIntent } from '../format.js';

	interface Props {
		label?: unknown;
		confirmLabel?: unknown;
		intent?: unknown;
		/** Pre-built handler — fires the wire action as declared, no extra context. */
		actions?: Record<string, () => void>;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, confirmLabel, intent, actions, weight, ariaLabel }: Props = $props();

	const tone = $derived(normalizeIntent(intent));

	// The confirm step is part of the component: first press arms, second fires,
	// blur or a beat of hesitation disarms. No modal, no round trip.
	let armed = $state(false);
	let timer: ReturnType<typeof setTimeout> | undefined;

	function press() {
		clearTimeout(timer);
		if (!armed) {
			armed = true;
			timer = setTimeout(() => (armed = false), 4000);
			return;
		}
		armed = false;
		actions?.action?.();
	}

	function disarm() {
		clearTimeout(timer);
		armed = false;
	}

	$effect(() => () => clearTimeout(timer));
</script>

<button
	type="button"
	class="auri-confirm auri-enter"
	class:armed
	data-intent={tone}
	style:flex-grow={weight}
	aria-label={ariaLabel}
	onclick={press}
	onblur={disarm}
	onkeydown={(e) => {
		if (e.key === 'Escape') disarm();
	}}
>
	{armed ? (confirmLabel ?? 'Confirm?') : label}
	<span class="auri-sr-only" aria-live="polite">{armed ? 'press again to confirm' : ''}</span>
</button>

<style>
	/* Foundation: resting = outline button, intent as text; armed = soft tint. */
	.auri-confirm {
		font: inherit;
		font-weight: 500;
		font-size: 0.875rem;
		min-height: 2.25rem;
		margin: var(--a2ui-space-leaf);
		padding: 0 1.1rem;
		border-radius: var(--auri-shape-md);
		border: 1px solid var(--auri-outline-variant);
		background: var(--auri-surface-container);
		color: var(--auri-on-surface);
		cursor: pointer;
		transition:
			background var(--auri-motion-fast) linear,
			color var(--auri-motion-fast) linear;
	}

	.auri-confirm:hover {
		background: var(--auri-surface-container-high);
	}

	.auri-confirm:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}

	/* Resting state hints the judgment; the armed state commits to it. */
	[data-intent='bad'] {
		color: var(--auri-intent-bad);
	}
	[data-intent='warning'] {
		color: var(--auri-intent-warning);
	}
	[data-intent='good'] {
		color: var(--auri-intent-good);
	}
	[data-intent='info'] {
		color: var(--auri-intent-info);
	}

	.armed[data-intent='bad'] {
		background: var(--auri-intent-bad-container);
		color: var(--auri-on-intent-bad-container);
	}
	.armed[data-intent='warning'] {
		background: var(--auri-intent-warning-container);
		color: var(--auri-on-intent-warning-container);
	}
	.armed[data-intent='good'] {
		background: var(--auri-intent-good-container);
		color: var(--auri-on-intent-good-container);
	}
	.armed[data-intent='info'] {
		background: var(--auri-intent-info-container);
		color: var(--auri-on-intent-info-container);
	}
	.armed[data-intent='neutral'] {
		background: var(--auri-primary-container);
		color: var(--auri-on-primary-container);
	}
	.armed {
		border-color: transparent;
		font-weight: 600;
	}
</style>
