<script lang="ts">
	import { SvelteSet } from 'svelte/reactivity';
	import { composeMixed, type CatalogContract, type ComposeSource } from '@aurilabs/core/compose';
	import { CATALOGS, componentDoc } from '$lib/components-data';
	import Copy from '$lib/Copy.svelte';

	const sources: ComposeSource[] = CATALOGS.map((info) => ({
		key: info.key,
		contract: info.contract as CatalogContract,
		prompt: info.pack,
		fixtures: Object.fromEntries(info.components.map((n) => [n, componentDoc(n).fixtureText]))
	}));
	// First sentence of the description, or the pack tagline where the schema
	// keeps descriptions per-prop (forms). Split skips the period in "e.g.".
	const blurb = (name: string) => {
		const doc = componentDoc(name);
		return (doc.description || doc.tagline).split(/\.(?:\s+(?=[A-Z])|$)/)[0].toLowerCase();
	};

	// The starter pick crosses catalogs on purpose — the mixed pack is the show.
	const picked = new SvelteSet(['Stat', 'Callout', 'TextField', 'SubmitBar']);
	let title = $state('my-console');

	const result = $derived(
		composeMixed({ sources, components: [...picked], title: title.trim() || undefined })
	);
	const slug = $derived((title.trim() || 'my-catalog').replace(/[^a-z0-9-]+/gi, '-').toLowerCase());

	const pickedBy = $derived(
		CATALOGS.map((info) => ({
			key: info.key,
			names: info.components.filter((n) => picked.has(n))
		})).filter((g) => g.names.length > 0)
	);

	const registration = $derived.by(() => {
		const imports = pickedBy
			.map((g) => `import { ${g.key}Catalog } from '@aurilabs/${g.key}';`)
			.join('\n');
		const entries = pickedBy
			.map((g) => `\tpick(${g.key}Catalog, [${g.names.map((n) => `'${n}'`).join(', ')}]),`)
			.join('\n');
		return `import { createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
${imports}

const pick = (catalog, names) =>
	({ id: catalog.id, components: Object.fromEntries(names.map((n) => [n, catalog.components[n]])) });

export const catalog = createCatalogRegistry([
${entries}
	basicCatalog
]);`;
	});

	const gate = $derived.by(() => {
		const runs = result.contracts
			.map(
				(c) => `node scripts/emission-eval.js \\
  --models openai:gpt-5.6 \\
  --pack ${slug}.pack.md \\
  --contract ${slug}.${c.key}.contract.json \\
  --scenarios-file your-scenarios.json`
			)
			.join('\n\n');
		return `# save the pack and each contract, then from packages/ops:
${runs}

# validation is per-catalog: each run validates its own catalog's components
# and skips the other's (they carry an explicit foreign catalogId on the wire).
# a model emitting a component you cut still fails its catalog's run.`;
	});
</script>

<svelte:head>
	<title>auri — composer</title>
	<meta
		name="description"
		content="Compose your own agent vocabulary across catalogs: pick components, get a merged prompt-pack, per-catalog contracts, and the emission-gate commands."
	/>
</svelte:head>

<section class="intro">
	<h1>Composer</h1>
	<p>
		A catalog is a vocabulary, and vocabularies should fit the product. Pick components from
		<strong>both catalogs</strong> and the composer builds the mix: one
		<strong>prompt-pack</strong> (the primary catalog carries the surface; the other's components
		ride the protocol's explicit-catalogId rule, with their fixtures rewritten into mixed examples),
		one <strong>contract per catalog</strong> for validation, and the
		<strong>registration</strong> for svelte-a2ui. The wire never changes — a composition narrows what
		the agent is taught and what the renderer accepts, nothing else.
	</p>
</section>

<section class="controls">
	<label>
		<span>name</span>
		<input type="text" bind:value={title} placeholder="my-console" />
	</label>
	<span class="count"
		>{result.chosen.length} components{result.primary ? ` · primary ${result.primary}` : ''} · pack {result.prompt.split(
			'\n'
		).length} lines</span
	>
	<span class="bulk">
		<button
			type="button"
			onclick={() => CATALOGS.forEach((c) => c.components.forEach((n) => picked.add(n)))}
			>all</button
		>
		<button type="button" onclick={() => picked.clear()}>none</button>
	</span>
</section>

{#each CATALOGS as info (info.key)}
	<fieldset class="picker">
		<legend>{info.title} — {info.blurb}</legend>
		{#each info.components as name (name)}
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
{/each}

{#if result.chosen.length === 0}
	<p class="empty">Pick at least one component — an empty vocabulary teaches nothing.</p>
{:else}
	<section class="outputs">
		<div class="pane wide">
			<div class="pane-head">
				<span>{slug}.pack.md — paste into your agent's system prompt</span>
				<Copy text={result.prompt} label="copy pack" />
			</div>
			<pre>{result.prompt}</pre>
		</div>
		{#each result.contracts as entry (entry.key)}
			<div class="pane">
				<div class="pane-head">
					<span>{slug}.{entry.key}.contract.json</span>
					<Copy text={JSON.stringify(entry.contract, null, '\t')} label="copy contract" />
				</div>
				<pre>{JSON.stringify(entry.contract, null, '\t')}</pre>
			</div>
		{/each}
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
				<Copy text={gate} label="copy commands" />
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
		margin: 0 0 1rem;
		padding: 0;
	}
	.picker legend {
		grid-column: 1 / -1;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface);
		padding: 0 0 0.4rem;
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
	.pane.wide {
		grid-column: 1 / -1;
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
