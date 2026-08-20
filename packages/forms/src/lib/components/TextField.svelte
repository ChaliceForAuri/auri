<script lang="ts">
	import { getRenderContext, type Binding, type CheckRule } from 'svelte-a2ui';
	import { fieldCtx, validateField } from '../checks.js';
	import Field from './Field.svelte';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		kind?: unknown;
		placeholder?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let { bindings, label, kind, placeholder, hint, disabled, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();
	const binding = $derived(bindings.value);
	let touched = $state(false);

	const TYPES: Record<string, string> = {
		text: 'text',
		email: 'email',
		url: 'url',
		tel: 'tel',
		secret: 'password'
	};
	const type = $derived(TYPES[String(kind)] ?? 'text');

	const validation = $derived(
		validateField(a2ui.spec.checks as CheckRule[] | undefined, binding?.value, fieldCtx(rc))
	);
	const errorId = $derived(`${a2ui.id}-errors`);
	const invalid = $derived(touched && !validation.valid);
</script>

<Field {label} {hint} {validation} show={touched} {errorId} {weight}>
	<input
		class="auri-control"
		{type}
		placeholder={placeholder == null ? undefined : String(placeholder)}
		disabled={disabled === true}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		aria-describedby={invalid ? errorId : undefined}
		value={binding?.value == null ? '' : String(binding.value)}
		oninput={(e) => binding?.set(e.currentTarget.value)}
		onblur={() => (touched = true)}
	/>
</Field>
