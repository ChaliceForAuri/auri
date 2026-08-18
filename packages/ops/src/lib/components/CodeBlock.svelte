<script lang="ts">
	interface Props {
		code?: unknown;
		language?: unknown;
		wrap?: unknown;
		label?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { code, language, wrap, label, weight, ariaLabel }: Props = $props();

	// undefined -> binding unresolved (skeleton). Text renders verbatim, never as markup.
	const text = $derived(code === undefined || code === null ? undefined : String(code));

	let copied = $state(false);
	let pre = $state<HTMLElement | null>(null);

	async function copy() {
		if (text === undefined) return;
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* clipboard unavailable (permissions/insecure context) — button stays quiet */
		}
	}

	// A growing log tail sticks to the bottom if it was already there.
	$effect(() => {
		text;
		if (!pre) return;
		const nearBottom = pre.scrollHeight - pre.scrollTop - pre.clientHeight < 48;
		if (nearBottom) pre.scrollTop = pre.scrollHeight;
	});
</script>

<div
	class="auri-codeblock auri-enter"
	style:flex-grow={weight}
	role="group"
	aria-label={ariaLabel ?? (label ? String(label) : 'code')}
>
	<div class="head">
		<span class="label">{label ?? (typeof language === 'string' ? language : 'code')}</span>
		<button type="button" onclick={copy} disabled={text === undefined} aria-label="copy code">
			{copied ? 'copied' : 'copy'}
		</button>
	</div>

	{#if text === undefined}
		<span class="auri-skeleton code-skeleton" aria-hidden="true"></span>
	{:else}
		<pre
			bind:this={pre}
			class:wrap={wrap === true}
			data-language={typeof language === 'string' ? language : undefined}><code>{text}</code></pre>
	{/if}
</div>

<style>
	.auri-codeblock {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
		overflow: hidden;
	}

	.head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.4rem 0.75rem;
		border-bottom: 1px solid var(--a2ui-color-border);
	}

	.label {
		font-size: var(--auri-type-caption-size);
		font-family: var(--a2ui-font-family-monospace);
		color: var(--a2ui-color-text-muted);
	}

	button {
		font: inherit;
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
		background: transparent;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius-small);
		padding: 0.1rem 0.6rem;
		cursor: pointer;
	}
	button:hover:not(:disabled) {
		color: var(--a2ui-color-text);
	}
	button:disabled {
		opacity: 0.5;
		cursor: default;
	}
	button:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
		outline-offset: 1px;
	}

	pre {
		margin: 0;
		padding: 0.75rem;
		max-height: 20rem;
		overflow: auto;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.8125rem;
		line-height: 1.55;
		color: var(--a2ui-color-text);
		tab-size: 2;
	}

	pre.wrap {
		white-space: pre-wrap;
		overflow-wrap: anywhere;
	}

	.code-skeleton {
		display: block;
		margin: 0.75rem;
		width: calc(100% - 1.5rem);
		height: 4.5rem;
	}
</style>
