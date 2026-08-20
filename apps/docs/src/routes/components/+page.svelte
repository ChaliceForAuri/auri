<script lang="ts">
	import { base } from '$app/paths';
	import { CATALOGS, componentDoc } from '$lib/components-data';

	const groups = CATALOGS.map((info) => ({
		...info,
		docs: info.components.map(componentDoc)
	}));
</script>

<svelte:head>
	<title>auri — components</title>
</svelte:head>

<section class="intro">
	<h1>The catalogs</h1>
	<p>
		Two vocabularies, both emission-gate green across two model families. Every page replays the
		component's own contract fixture — scrub the wire, read the schema, copy the prompt-pack for
		your agent. Mix them on one surface with the <a href="{base}/composer">composer</a>.
	</p>
</section>

{#each groups as group (group.key)}
	<section class="catalog">
		<h2>{group.title} <span class="count">{group.components.length}</span></h2>
		<p class="blurb">{group.blurb}</p>
		<div class="grid">
			{#each group.docs as doc (doc.name)}
				<a class="card" href="{base}/components/{doc.name.toLowerCase()}">
					<span class="name">{doc.name}</span>
					<span class="tagline">{doc.tagline}</span>
				</a>
			{/each}
		</div>
	</section>
{/each}

<style>
	.intro {
		max-width: 44rem;
		padding: 2rem 0 1rem;
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
	.intro a {
		color: var(--auri-primary);
	}

	.catalog {
		padding: 1.25rem 0 0.5rem;
	}
	h2 {
		margin: 0 0 0.15rem;
		font-size: 1.125rem;
		letter-spacing: -0.01em;
		display: flex;
		align-items: baseline;
		gap: 0.5rem;
	}
	.count {
		font-size: var(--auri-type-caption-size);
		font-weight: 500;
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}
	.blurb {
		margin: 0 0 0.75rem;
		font-size: 0.875rem;
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
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
		text-decoration: none;
		transition: border-color var(--auri-motion-fast) linear;
	}
	.card:hover {
		border-color: var(--auri-primary);
	}
	.name {
		font-weight: 600;
		color: var(--auri-on-surface);
	}
	.tagline {
		font-size: 0.8125rem;
		color: var(--auri-on-surface-variant);
		line-height: 1.5;
	}
</style>
