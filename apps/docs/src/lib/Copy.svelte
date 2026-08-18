<script lang="ts">
	let { text, label = 'copy' }: { text: string; label?: string } = $props();

	let copied = $state(false);

	async function copy() {
		try {
			await navigator.clipboard.writeText(text);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {
			/* clipboard unavailable — stay quiet */
		}
	}
</script>

<button type="button" onclick={copy}>{copied ? 'copied' : label}</button>

<style>
	button {
		font: inherit;
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
		background: transparent;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius-small);
		padding: 0.1rem 0.6rem;
		cursor: pointer;
		white-space: nowrap;
	}
	button:hover {
		color: var(--a2ui-color-text);
	}
	button:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
		outline-offset: 1px;
	}
</style>
