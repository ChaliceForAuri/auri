<script lang="ts">
	import { formatCellNumber, normalizeIntent } from '../format.js';

	interface Props {
		label?: unknown;
		value?: unknown;
		max?: unknown;
		intent?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, value, max, intent, weight, ariaLabel }: Props = $props();

	const tone = $derived(normalizeIntent(intent));
	const top = $derived(typeof max === 'number' && max > 0 ? max : 100);
	// The contract: no value prop at all means indeterminate.
	const determinate = $derived(typeof value === 'number' && Number.isFinite(value));
	const current = $derived(determinate ? Math.max(0, Math.min(value as number, top)) : 0);
	const fraction = $derived(determinate ? current / top : 0);
</script>

<div class="auri-progress auri-enter" data-intent={tone} style:flex-grow={weight}>
	<div class="head">
		<span class="label">{label}</span>
		{#if determinate}
			<span class="counts">{formatCellNumber(current)} / {formatCellNumber(top)}</span>
		{/if}
	</div>
	<div
		class="track"
		class:indeterminate={!determinate}
		role="progressbar"
		aria-label={ariaLabel ?? String(label ?? '')}
		aria-valuemin={determinate ? 0 : undefined}
		aria-valuemax={determinate ? top : undefined}
		aria-valuenow={determinate ? current : undefined}
	>
		<div
			class="fill"
			style:width={determinate ? `${(fraction * 100).toFixed(2)}%` : undefined}
		></div>
	</div>
</div>

<style>
	.auri-progress {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		margin-bottom: 0.35rem;
	}

	.label {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
		overflow-wrap: anywhere;
	}

	.counts {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}

	.track {
		height: 0.55rem;
		border-radius: var(--auri-shape-pill);
		background: var(--auri-intent-neutral-container);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: var(--auri-shape-pill);
		background: var(--auri-primary);
		/* Advancing via updateDataModel glides; interruptions retarget (DESIGN 4). */
		transition: width var(--auri-motion-base) var(--auri-ease-out);
	}

	[data-intent='good'] .fill {
		background: var(--auri-intent-good);
	}
	[data-intent='bad'] .fill {
		background: var(--auri-intent-bad);
	}
	[data-intent='warning'] .fill {
		background: var(--auri-intent-warning);
	}
	[data-intent='info'] .fill {
		background: var(--auri-intent-info);
	}

	.indeterminate .fill {
		width: 35%;
		animation: auri-indeterminate 1.4s var(--auri-ease-out) infinite;
	}

	@keyframes auri-indeterminate {
		from {
			transform: translateX(-110%);
		}
		to {
			transform: translateX(400%);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
		.indeterminate .fill {
			animation: auri-indeterminate-pulse 1.6s linear infinite;
			transform: none;
			width: 100%;
		}
	}

	@keyframes auri-indeterminate-pulse {
		0%,
		100% {
			opacity: 0.35;
		}
		50% {
			opacity: 0.75;
		}
	}
</style>
