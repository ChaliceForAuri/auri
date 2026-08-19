<script lang="ts">
	import { base } from '$app/paths';

	const pages = [
		{
			slug: 'colors',
			name: 'Colors',
			blurb:
				'The neutral ground, the green accent, five intents — and the budget that keeps color meaningful.'
		},
		{
			slug: 'typography',
			name: 'Typography',
			blurb:
				'Three type roles, tabular numerals, why components inherit your font, and Geist on this site.'
		},
		{
			slug: 'spacing',
			name: 'Spacing',
			blurb: 'The leaf-margin strategy: compact components, generous pages, streams that compose.'
		},
		{
			slug: 'radii',
			name: 'Radii',
			blurb: 'Four steps — 6, 10, 14, pill — and exactly which components use which.'
		},
		{
			slug: 'motion',
			name: 'Motion',
			blurb:
				'The entrance, the stagger, interruptibility, and what reduced-motion users get instead.'
		},
		{
			slug: 'states',
			name: 'In-between states',
			blurb: 'Skeleton, empty, error — components arrive before their data, so the gap is designed.'
		},
		{
			slug: 'accessibility',
			name: 'Accessibility',
			blurb:
				'Enforced by the contract: pages that don’t exist until runtime can’t be audited, so the schema does it.'
		}
	];
</script>

<svelte:head>
	<title>auri — foundations</title>
</svelte:head>

<div class="doc">
	<h1>Foundations</h1>
	<p class="lede">
		Every rule the components live by, written down. Nothing is hidden: if a value ships, it is
		documented here, and the swatches and demos on these pages render from the live tokens — they
		cannot drift from what you install.
	</p>
</div>

<div class="card-grid">
	{#each pages as p (p.slug)}
		<a href="{base}/foundations/{p.slug}">
			<span class="name">{p.name}</span>
			<span class="blurb">{p.blurb}</span>
		</a>
	{/each}
</div>
