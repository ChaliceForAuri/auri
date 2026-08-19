<svelte:head>
	<title>auri — radii</title>
</svelte:head>

<div class="doc">
	<h1>Radii</h1>
	<p class="lede">
		Four steps, used consistently — crisp corners are half of what makes the system feel engineered
		rather than decorated.
	</p>

	<h2>The scale</h2>
	<table>
		<thead>
			<tr><th></th><th>Token</th><th>Used by</th></tr>
		</thead>
		<tbody>
			<tr>
				<td
					><span
						class="swatch"
						style="border-radius: var(--auri-shape-sm); background: var(--auri-surface-container-high); border: 1px solid var(--auri-outline-variant);"
					></span></td
				>
				<td><code>--auri-shape-sm</code> · 6px</td>
				<td>badges, delta chips, small controls</td>
			</tr>
			<tr>
				<td
					><span
						class="swatch"
						style="border-radius: var(--auri-shape-md); background: var(--auri-surface-container-high); border: 1px solid var(--auri-outline-variant);"
					></span></td
				>
				<td><code>--auri-shape-md</code> · 10px</td>
				<td>buttons, inputs, callouts, code insets</td>
			</tr>
			<tr>
				<td
					><span
						class="swatch"
						style="border-radius: var(--auri-shape-lg); background: var(--auri-surface-container-high); border: 1px solid var(--auri-outline-variant);"
					></span></td
				>
				<td><code>--auri-shape-lg</code> · 14px</td>
				<td>cards: Stat, Chart, DataTable, ApprovalCard, CodeBlock</td>
			</tr>
			<tr>
				<td
					><span
						class="swatch"
						style="border-radius: var(--auri-shape-pill); background: var(--auri-surface-container-high); border: 1px solid var(--auri-outline-variant);"
					></span></td
				>
				<td><code>--auri-shape-pill</code></td>
				<td>progress tracks only</td>
			</tr>
		</tbody>
	</table>

	<h2>The rule</h2>
	<p>
		Radius follows role, never taste-per-component: a chip is 6px whether it lives in a Stat or a
		Badge; a card is 14px whether it holds a chart or a decision. The base step (10px) is adopted
		from shadcn/ui v4's <code>0.625rem</code>; the scale is one notch tighter and one notch looser
		around it, and nothing else.
	</p>
</div>
