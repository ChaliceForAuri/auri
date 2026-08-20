<script lang="ts">
	import { getRenderContext, type Binding, type CheckRule } from 'svelte-a2ui';
	import { fieldCtx, validateField } from '../checks.js';
	import Field from './Field.svelte';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		min?: unknown;
		max?: unknown;
		step?: unknown;
		unit?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let { bindings, label, min, max, step, unit, hint, disabled, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();
	const binding = $derived(bindings.value);
	let touched = $state(false);

	const validation = $derived(
		validateField(a2ui.spec.checks as CheckRule[] | undefined, binding?.value, fieldCtx(rc))
	);
	const errorId = $derived(`${a2ui.id}-errors`);
	const invalid = $derived(touched && !validation.valid);

	// The answer is a raw number in the data model; an emptied input is null,
	// never the string '' (raw values on the wire cuts both ways).
	function write(raw: string) {
		binding?.set(raw === '' ? null : Number(raw));
	}
</script>

<Field {label} {hint} {validation} show={touched} {errorId} {weight}>
	<span class="row">
		<input
			class="auri-control"
			type="number"
			min={typeof min === 'number' ? min : undefined}
			max={typeof max === 'number' ? max : undefined}
			step={typeof step === 'number' ? step : undefined}
			disabled={disabled === true}
			aria-label={ariaLabel}
			aria-invalid={invalid}
			aria-describedby={invalid ? errorId : undefined}
			value={binding?.value == null ? '' : String(binding.value)}
			oninput={(e) => write(e.currentTarget.value)}
			onblur={() => (touched = true)}
		/>
		{#if unit != null}<span class="unit">{unit}</span>{/if}
	</span>
</Field>

<style>
	.row {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.unit {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		white-space: nowrap;
	}
</style>
