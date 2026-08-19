<svelte:head>
	<title>auri — typography</title>
</svelte:head>

<div class="doc">
	<h1>Typography</h1>
	<p class="lede">
		auri ships a type <em>scale</em>, not a typeface. Components inherit whatever font your
		application uses, so they look native in your product on day one — the scale is what makes
		twelve components read as one object.
	</p>

	<h2>The three roles</h2>
	<table>
		<thead>
			<tr><th>Role</th><th>Tokens</th><th>Sample</th></tr>
		</thead>
		<tbody>
			<tr>
				<td>value — the big number</td>
				<td><code>1.75rem / 600</code>, tracking −0.025em</td>
				<td
					><span
						style="font-size: var(--auri-type-value-size); font-weight: var(--auri-type-value-weight); letter-spacing: -0.025em; font-variant-numeric: tabular-nums;"
						>4.8<span style="font-size: 0.875rem; color: var(--auri-on-surface-variant);">
							%</span
						></span
					></td
				>
			</tr>
			<tr>
				<td>label — what it is</td>
				<td><code>0.8125rem / 500</code></td>
				<td
					><span
						style="font-size: var(--auri-type-label-size); font-weight: var(--auri-type-label-weight); color: var(--auri-on-surface-variant);"
						>Error rate</span
					></td
				>
			</tr>
			<tr>
				<td>caption — the context</td>
				<td><code>0.75rem / 400</code></td>
				<td
					><span
						style="font-size: var(--auri-type-caption-size); color: var(--auri-on-surface-variant);"
						>last 15 min</span
					></td
				>
			</tr>
		</tbody>
	</table>

	<h2>Numbers never jiggle</h2>
	<p>
		Every value that can update in place uses <code>font-variant-numeric: tabular-nums</code>, so a
		stat climbing from <code>0.4</code> to <code>4.8</code> doesn't shove its neighbors. Streaming UI
		lives or dies on this detail:
	</p>
	<div
		class="demo"
		style="font-variant-numeric: tabular-nums; font-size: 1.25rem; font-weight: 600;"
	>
		<div>1,111,111</div>
		<div>8,888,888</div>
	</div>

	<h2>Why components inherit your font</h2>
	<p>
		A catalog drops into someone else's product. Shipping a typeface would make agent-rendered
		surfaces look like a foreign object inside the host app — so the components set sizes, weights,
		and numerics, and leave the family to you.
	</p>

	<h2>This site's voice: Geist</h2>
	<p style="font-family: var(--a2ui-font-family);">
		The docs are set in <a href="https://vercel.com/font">Geist</a> (Vercel, SIL OFL 1.1),
		self-hosted as variable fonts — <span style="font-weight: 300;">light</span>,
		<span style="font-weight: 500;">medium</span>, <span style="font-weight: 700;">bold</span> —
		with
		<span style="font-family: var(--a2ui-font-family-monospace); font-size: 0.9em;"
			>Geist Mono for the wire and the logs</span
		>. That's the site making a choice a host app is equally free to make.
	</p>
</div>
