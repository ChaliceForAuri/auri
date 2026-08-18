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
	.auri-confirm {
		font: inherit;
		font-weight: 500;
		min-height: var(--a2ui-control-height);
		margin: var(--a2ui-space-leaf);
		padding: 0 1rem;
		border-radius: var(--a2ui-radius-small);
		border: 1px solid var(--a2ui-color-border);
		background: var(--a2ui-color-surface-raised);
		color: var(--a2ui-color-text);
		cursor: pointer;
		transition:
			background var(--auri-motion-fast) linear,
			border-color var(--auri-motion-fast) linear,
			color var(--auri-motion-fast) linear;
	}

	.auri-confirm:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
		outline-offset: 2px;
	}

	/* Resting state hints the judgment; the armed state commits to it. */
	[data-intent='bad'] {
		color: var(--auri-intent-bad);
		border-color: var(--auri-intent-bad-border);
	}
	[data-intent='warning'] {
		color: var(--auri-intent-warning);
		border-color: var(--auri-intent-warning-border);
	}
	[data-intent='good'] {
		color: var(--auri-intent-good);
		border-color: var(--auri-intent-good-border);
	}
	[data-intent='info'] {
		color: var(--auri-intent-info);
		border-color: var(--auri-intent-info-border);
	}

	.armed {
		background: var(--auri-intent-neutral-surface);
	}
	.armed[data-intent='bad'] {
		background: var(--auri-intent-bad-surface);
	}
	.armed[data-intent='warning'] {
		background: var(--auri-intent-warning-surface);
	}
	.armed[data-intent='good'] {
		background: var(--auri-intent-good-surface);
	}
	.armed[data-intent='info'] {
		background: var(--auri-intent-info-surface);
	}
</style>
