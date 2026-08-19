<svelte:head>
	<title>auri — spacing</title>
</svelte:head>

<div class="doc">
	<h1>Spacing</h1>
	<p class="lede">
		Compact components, generous pages. Components carry their own tight internal rhythm; the space <em
			>between</em
		> things belongs to the layout — and to a rule that makes streamed trees compose predictably.
	</p>

	<h2>The leaf-margin strategy</h2>
	<p>
		Containers contribute no spacing; leaves do. Every auri component carries
		<code>margin: var(--a2ui-space-leaf)</code> (0.5rem) on its own edge, and layout containers (Row,
		Column, Card) add none. The consequence: an agent can compose any tree in any order and spacing stays
		even — no margin collapse, no first-child special cases, no gaps that depend on what streamed in before.
	</p>
	<div class="demo" style="display: flex; flex-wrap: wrap;">
		<span
			style="margin: 0.5rem; padding: 0.6rem 1rem; border: 1px dashed var(--auri-outline-variant); border-radius: var(--auri-shape-md); font-size: 0.8125rem; color: var(--auri-on-surface-variant);"
			>leaf + 0.5rem</span
		>
		<span
			style="margin: 0.5rem; padding: 0.6rem 1rem; border: 1px dashed var(--auri-outline-variant); border-radius: var(--auri-shape-md); font-size: 0.8125rem; color: var(--auri-on-surface-variant);"
			>leaf + 0.5rem</span
		>
		<span
			style="margin: 0.5rem; padding: 0.6rem 1rem; border: 1px dashed var(--auri-outline-variant); border-radius: var(--auri-shape-md); font-size: 0.8125rem; color: var(--auri-on-surface-variant);"
			>leaf + 0.5rem</span
		>
	</div>

	<h2>Internal rhythm</h2>
	<ul>
		<li>Cards (Stat, Chart, ApprovalCard): <code>1rem–1.25rem</code> inset.</li>
		<li>Table cells: <code>0.55rem 1.1rem</code> — dense rows, readable columns.</li>
		<li>Inside-component gaps use flex/grid <code>gap</code>, never stacked margins.</li>
		<li>Chips and badges hug their text: <code>0.2em 0.7em</code>.</li>
	</ul>

	<h2>Page rhythm</h2>
	<p>
		Surfaces breathe at the page level: this site holds content at a 72rem frame with prose at
		46rem, and lets whitespace — not boxes — do the separating. Density belongs inside the
		component; calm belongs around it.
	</p>
</div>
