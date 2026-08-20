<script lang="ts">
	import { getRenderContext, type Binding, type CheckRule } from 'svelte-a2ui';
	import { fieldCtx, validateField } from '../checks.js';
	import { normalizeOptions } from '../options.js';
	import Field from './Field.svelte';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		options?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let { bindings, label, options, hint, disabled, weight, a2ui }: Props = $props();

	const rc = getRenderContext();
	const binding = $derived(bindings.value);
	let touched = $state(false);

	const opts = $derived(normalizeOptions(options));
	const current = $derived(typeof binding?.value === 'string' ? binding.value : '');

	const validation = $derived(
		validateField(a2ui.spec.checks as CheckRule[] | undefined, binding?.value, fieldCtx(rc))
	);
	const errorId = $derived(`${a2ui.id}-errors`);
</script>

<Field {label} {hint} group {validation} show={touched} {errorId} {weight}>
	<div class="choices" role="none">
		{#each opts as option (option.value)}
			<label class="choice">
				<input
					type="radio"
					name={a2ui.id}
					value={option.value}
					checked={current === option.value}
					disabled={disabled === true}
					aria-describedby={touched && !validation.valid ? errorId : undefined}
					onchange={() => {
						touched = true;
						binding?.set(option.value);
					}}
				/>
				<span>{option.label}</span>
			</label>
		{/each}
	</div>
</Field>

<style>
	.choices {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
	}
	.choice {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--auri-on-surface);
		cursor: pointer;
	}
	.choice input {
		accent-color: var(--auri-primary);
		width: 1rem;
		height: 1rem;
		margin: 0;
	}
	.choice input:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}
	.choice input:disabled,
	.choice:has(input:disabled) {
		opacity: 0.55;
		cursor: not-allowed;
	}
</style>
