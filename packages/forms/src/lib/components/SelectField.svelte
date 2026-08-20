<script lang="ts">
	import { getRenderContext, type Binding, type CheckRule } from 'svelte-a2ui';
	import { fieldCtx, validateField } from '../checks.js';
	import { normalizeOptions } from '../options.js';
	import Field from './Field.svelte';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		options?: unknown;
		placeholder?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let { bindings, label, options, placeholder, hint, disabled, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();
	const binding = $derived(bindings.value);
	let touched = $state(false);

	const opts = $derived(normalizeOptions(options));
	const current = $derived(typeof binding?.value === 'string' ? binding.value : '');

	const validation = $derived(
		validateField(a2ui.spec.checks as CheckRule[] | undefined, binding?.value, fieldCtx(rc))
	);
	const errorId = $derived(`${a2ui.id}-errors`);
	const invalid = $derived(touched && !validation.valid);
</script>

<Field {label} {hint} {validation} show={touched} {errorId} {weight}>
	<select
		class="auri-control"
		disabled={disabled === true}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		aria-describedby={invalid ? errorId : undefined}
		value={current}
		onchange={(e) => {
			touched = true;
			binding?.set(e.currentTarget.value);
		}}
		onblur={() => (touched = true)}
	>
		{#if current === ''}
			<option value="" disabled>{placeholder ?? ''}</option>
		{/if}
		{#each opts as option (option.value)}
			<option value={option.value}>{option.label}</option>
		{/each}
	</select>
</Field>
