<script lang="ts">
	import { getRenderContext, type Binding, type CheckRule } from 'svelte-a2ui';
	import { fieldCtx, validateField } from '../checks.js';
	import Field from './Field.svelte';

	interface Props {
		bindings: Record<string, Binding>;
		label?: unknown;
		rows?: unknown;
		maxLength?: unknown;
		placeholder?: unknown;
		hint?: unknown;
		disabled?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; spec: Record<string, unknown> };
	}

	let {
		bindings,
		label,
		rows,
		maxLength,
		placeholder,
		hint,
		disabled,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();
	const binding = $derived(bindings.value);
	let touched = $state(false);

	const text = $derived(binding?.value == null ? '' : String(binding.value));
	const limit = $derived(typeof maxLength === 'number' ? maxLength : undefined);
	const counter = $derived(limit === undefined ? undefined : `${text.length}/${limit}`);

	const validation = $derived(
		validateField(a2ui.spec.checks as CheckRule[] | undefined, binding?.value, fieldCtx(rc))
	);
	const errorId = $derived(`${a2ui.id}-errors`);
	const invalid = $derived(touched && !validation.valid);
</script>

<Field {label} {hint} meta={counter} {validation} show={touched} {errorId} {weight}>
	<textarea
		class="auri-control"
		rows={typeof rows === 'number' ? rows : 3}
		maxlength={limit}
		placeholder={placeholder == null ? undefined : String(placeholder)}
		disabled={disabled === true}
		aria-label={ariaLabel}
		aria-invalid={invalid}
		aria-describedby={invalid ? errorId : undefined}
		value={text}
		oninput={(e) => binding?.set(e.currentTarget.value)}
		onblur={() => (touched = true)}
	></textarea>
</Field>
