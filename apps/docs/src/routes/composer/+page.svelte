<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { composeCatalog, type CatalogContract } from '@aurilabs/core/compose';
	import { COMPONENT_NAMES, componentDoc } from '$lib/components-data';
	import Copy from '$lib/Copy.svelte';
	import contractJson from '$lib/generated/catalog.json';
	import promptText from '$lib/generated/prompt.md?raw';

	const contract = contractJson as CatalogContract;
	const fixtures = Object.fromEntries(
		COMPONENT_NAMES.map((name) => [name, componentDoc(name).fixtureText])
	);
	// First sentence only — split on sentence-ending periods, not the one in "e.g.".
	const blurb = (name: string) =>
		(componentDoc(name).description ?? '').split(/\.(?:\s+(?=[A-Z])|$)/)[0].toLowerCase();

	const picked = new SvelteSet(['Stat', 'Callout', 'ApprovalCard']);
	let title = $state('my-console');

	const result = $derived(
		composeCatalog({
			contract,
			prompt: promptText,
			fixtures,
			components: [...picked],
			title: title.trim() || undefined
		})
	);
	const contractText = $derived(JSON.stringify(result.contract, null, '\t'));
	const slug = $derived((title.trim() || 'my-catalog').replace(/[^a-z0-9-]+/gi, '-').toLowerCase());

	const registration = $derived(`import { createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
import { opsCatalog } from '@aurilabs/ops';

const picked = [${result.chosen.map((n) => `'${n}'`).join(', ')}];
export const catalog = createCatalogRegistry([
	// Components keep their source catalog id on the wire — a composition
	// narrows the vocabulary, it never creates a new wire catalog.
	{ id: opsCatalog.id, components: Object.fromEntries(picked.map((n) => [n, opsCatalog.components[n]])) },
	basicCatalog
]);`);

	const gate = $derived(`# save the two artifacts beside the auri checkout, then from packages/ops:
node scripts/emission-eval.js \\
  --models openai:gpt-5.6 \\
  --pack ${slug}.pack.md \\
  --contract ${slug}.contract.json

# the composed contract makes vocabulary escapes fail the eval:
# a model reaching for a component you cut is an error, not a pass.`);
</script>

<svelte:head>
	<title>auri — composer</title>
	<meta
		name="description"
		content="Compose your own agent vocabulary: pick components, get a merged contract and prompt-pack, and run the emission gate against the composition."
	/>
</svelte:head>

<section class="intro">
	<h1>Composer</h1>
	<p>
		A catalog is a vocabulary, and vocabularies should fit the product. Pick the components your
		agent actually needs and the composer cuts the three artifacts down to exactly that: a
		<strong>contract</strong> with only your components (unused schema defs pruned), a
		<strong>prompt-pack</strong> that teaches only your vocabulary (with your components' fixtures
		as its examples), and the <strong>registration</strong> for svelte-a2ui. Emitted components keep their
		source catalog id, so the wire never changes — a composition narrows what the agent is taught and
		what the renderer accepts, nothing else.
	</p>
</section>

<section class="controls">
	<label>
		<span>name</span>
		<input type="text" bind:value={title} placeholder="my-console" />
	</label>
	<span class="count"
		>{result.chosen.length} of {COMPONENT_NAMES.length} components · pack {result.prompt.split('\n')
			.length} lines ({promptText.split('\n').length} full)</span
	>
	<span class="bulk">
		<button type="button" onclick={() => COMPONENT_NAMES.forEach((n) => picked.add(n))}>all</button>
		<button type="button" onclick={() => picked.clear()}>none</button>
	</span>
</section>

<fieldset class="picker">
	<legend class="auri-sr-only">choose components</legend>
	{#each COMPONENT_NAMES as name (name)}
		<label class="pick" class:on={picked.has(name)}>
			<input
				type="checkbox"
				checked={picked.has(name)}
				onchange={() => (picked.has(name) ? picked.delete(name) : picked.add(name))}
			/>
			<span class="pick-name">{name}</span>
			<span class="pick-blurb">{blurb(name)}</span>
		</label>
	{/each}
</fieldset>

{#if result.chosen.length === 0}
	<p class="empty">Pick at least one component — an empty vocabulary teaches nothing.</p>
{:else}
	<section class="outputs">
		<div class="pane">
			<div class="pane-head">
				<span>{slug}.pack.md — paste into your agent's system prompt</span>
				<Copy text={result.prompt} label="copy pack" />
			</div>
			<pre>{result.prompt}</pre>
		</div>
		<div class="pane">
			<div class="pane-head">
				<span>{slug}.contract.json — the composed contract</span>
				<Copy text={contractText} label="copy contract" />
			</div>
			<pre>{contractText}</pre>
		</div>
		<div class="pane">
			<div class="pane-head">
				<span>registration — svelte-a2ui</span>
				<Copy text={registration} label="copy registration" />
			</div>
			<pre>{registration}</pre>
		</div>
		<div class="pane">
			<div class="pane-head">
				<span>run the gate against your composition</span>
				<Copy text={gate} label="copy command" />
			</div>
			<pre>{gate}</pre>
		</div>
	</section>
{/if}

<style>
	.intro {
		max-width: 44rem;
		padding: 1.5rem 0 1rem;
	}
	h1 {
		margin: 0 0 0.35rem;
		font-size: 1.6rem;
		letter-spacing: -0.02em;
	}
	.intro p {
		margin: 0;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}

	.controls {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.75rem 1.25rem;
		padding-bottom: 0.9rem;
	}
	.controls label {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--auri-on-surface-variant);
	}
	.controls input[type='text'] {
		font: inherit;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.8125rem;
		color: var(--auri-on-surface);
		background: var(--auri-input-fill);
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-sm);
		padding: 0.3rem 0.6rem;
		width: 12rem;
	}
	.count {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}
	.bulk {
		display: inline-flex;
		gap: 0.4rem;
	}
	.bulk button {
		font: inherit;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		background: transparent;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-sm);
		padding: 0.15rem 0.6rem;
		cursor: pointer;
	}
	.bulk button:hover {
		color: var(--auri-on-surface);
	}

	.picker {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(13rem, 1fr));
		gap: 0.5rem;
		border: none;
		margin: 0 0 1.25rem;
		padding: 0;
	}
	.pick {
		display: grid;
		grid-template-columns: auto 1fr;
		align-items: baseline;
		column-gap: 0.5rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-md);
		background: var(--auri-surface-container);
		cursor: pointer;
		transition: border-color var(--auri-motion-fast) linear;
	}
	.pick:hover {
		border-color: var(--auri-primary);
	}
	.pick.on {
		background: var(--auri-primary-container);
		border-color: transparent;
	}
	.pick input {
		accent-color: var(--auri-primary);
	}
	.pick-name {
		font-weight: 600;
		font-size: 0.875rem;
		color: var(--auri-on-surface);
	}
	.pick.on .pick-name {
		color: var(--auri-on-primary-container);
	}
	.pick-blurb {
		grid-column: 2;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		line-height: 1.45;
	}

	.empty {
		color: var(--auri-on-surface-variant);
		font-size: 0.9375rem;
		padding: 1rem 0 2rem;
	}

	.outputs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 26rem), 1fr));
		gap: 1rem;
		padding-bottom: 2rem;
	}
	.pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
	}
	.pane-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--a2ui-color-border);
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
	}
	pre {
		margin: 0;
		padding: 0.75rem;
		overflow: auto;
		max-height: 24rem;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.71875rem;
		line-height: 1.55;
		color: var(--a2ui-color-text);
		tab-size: 2;
	}
</style>
