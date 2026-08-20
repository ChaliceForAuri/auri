<script lang="ts">
	import { onMount } from 'svelte';
	import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
	import { opsCatalog } from '@aurilabs/ops';
	import { formsCatalog } from '@aurilabs/forms';
	import { createIncidentReplay, SURFACE, type RailLine } from '$lib/incident';

	const catalog = createCatalogRegistry([opsCatalog, formsCatalog, basicCatalog]);

	let rail = $state<RailLine[]>([]);
	let client = $state<A2uiClient | null>(null);
	let run = $state(0);
	let railEl = $state<HTMLElement | null>(null);

	function play() {
		client?.destroy();
		rail = [];
		const next = new A2uiClient({ transport: createIncidentReplay((line) => rail.push(line)) });
		client = next;
		run += 1;
		next.start();
	}

	onMount(() => {
		play();
		return () => client?.destroy();
	});

	$effect(() => {
		rail.length;
		if (railEl) railEl.scrollTop = railEl.scrollHeight;
	});
</script>

<svelte:head>
	<title>auri — the agent ops console, streaming</title>
	<meta
		name="description"
		content="Beautiful, agent-facing component catalogs for A2UI. Watch an agent build an ops console live."
	/>
</svelte:head>

<section class="intro">
	<h1>An agent is about to build this page.</h1>
	<p>
		auri is a library of agent-facing component catalogs for
		<a href="https://a2ui.org">A2UI</a>. What renders on the left is described entirely by the JSONL
		on the right — streamed, data-bound, no agent-authored code. The approval card is real: decide,
		and watch the wire.
	</p>
	<button type="button" class="replay" onclick={play}>replay</button>
</section>

<section class="stage">
	<div class="canvas">
		{#key run}
			{#if client}
				<Surface {client} {catalog} surfaceId={SURFACE} />
			{/if}
		{/key}
	</div>
	<aside class="rail" aria-label="the wire, live" bind:this={railEl}>
		{#each rail as line, i (i)}
			<div class="line" data-dir={line.dir}>
				<span class="dir">{line.dir === 'in' ? '→ renderer' : '→ agent'}</span>
				<span class="kind">{line.kind}</span>
				<code>{line.text}</code>
			</div>
		{/each}
		{#if rail.length === 0}
			<p class="rail-empty">waiting for the stream…</p>
		{/if}
	</aside>
</section>

<style>
	.intro {
		max-width: 44rem;
		padding: 2rem 0 1.5rem;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.9rem;
		letter-spacing: -0.02em;
	}
	.intro p {
		margin: 0 0 1rem;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}
	.intro a {
		color: var(--a2ui-color-primary);
	}

	.replay {
		font: inherit;
		font-size: 0.875rem;
		padding: 0.35rem 1rem;
		border-radius: var(--a2ui-radius-small);
		border: 1px solid var(--a2ui-color-border);
		background: var(--a2ui-color-surface-raised);
		color: var(--a2ui-color-text);
		cursor: pointer;
	}
	.replay:hover {
		border-color: var(--a2ui-color-primary);
	}

	.stage {
		display: grid;
		grid-template-columns: minmax(0, 1fr) 24rem;
		gap: 1rem;
		align-items: start;
	}
	@media (max-width: 56rem) {
		.stage {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.canvas {
		min-height: 34rem;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		padding: 0.75rem;
	}

	.rail {
		position: sticky;
		top: 1rem;
		min-height: 10rem;
		max-height: calc(100vh - 2rem);
		overflow-y: auto;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
		padding: 0.75rem;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.6875rem;
		line-height: 1.5;
	}

	.line {
		margin-bottom: 0.6rem;
	}
	.line .dir {
		color: var(--a2ui-color-text-muted);
		margin-inline-end: 0.5em;
	}
	.line[data-dir='out'] .dir {
		color: var(--a2ui-color-primary);
		font-weight: 600;
	}
	.line .kind {
		color: var(--a2ui-color-primary);
	}
	.line[data-dir='out'] {
		border-inline-start: 2px solid var(--a2ui-color-primary);
		padding-inline-start: 0.5rem;
	}
	.line code {
		display: block;
		color: var(--a2ui-color-text-muted);
		overflow-wrap: anywhere;
	}

	.rail-empty {
		margin: 0;
		color: var(--a2ui-color-text-muted);
	}
</style>
