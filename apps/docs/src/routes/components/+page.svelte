<script lang="ts">
	import { base } from '$app/paths';
	import { COMPONENT_NAMES, componentDoc } from '$lib/components-data';

	const docs = COMPONENT_NAMES.map(componentDoc);
</script>

<svelte:head>
	<title>auri — components</title>
</svelte:head>

<section class="intro">
	<h1>The ops catalog</h1>
	<p>
		Twelve components, one vocabulary. Every page replays the component's own contract fixture —
		scrub the wire, read the schema, copy the prompt-pack for your agent.
	</p>
</section>

<div class="grid">
	{#each docs as doc (doc.name)}
		<a class="card" href="{base}/components/{doc.name.toLowerCase()}">
			<span class="name">{doc.name}</span>
			<span class="tagline">{doc.tagline}</span>
		</a>
	{/each}
</div>

<style>
	.intro {
		max-width: 44rem;
		padding: 2rem 0 1.5rem;
	}
	h1 {
		margin: 0 0 0.5rem;
		font-size: 1.6rem;
		letter-spacing: -0.02em;
	}
	.intro p {
		margin: 0;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
		gap: 0.75rem;
	}

	.card {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		padding: 1rem;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
		text-decoration: none;
		transition: border-color var(--auri-motion-fast) linear;
	}
	.card:hover {
		border-color: var(--a2ui-color-primary);
	}

	.name {
		font-weight: 600;
		color: var(--a2ui-color-text);
	}
	.tagline {
		font-size: 0.8125rem;
		color: var(--a2ui-color-text-muted);
	}
</style>
