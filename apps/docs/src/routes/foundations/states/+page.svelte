<svelte:head>
	<title>auri — in-between states</title>
</svelte:head>

<div class="doc">
	<h1>In-between states</h1>
	<p class="lede">
		In agent-driven UI, components routinely arrive <em>before</em> their data: a table binds
		<code>rows: &#123;"path": "/deploys"&#125;</code> and the deploys stream in later. The gap is where
		quality is felt, so all three states are contract-level commitments, not afterthoughts.
	</p>

	<h2>Skeleton — the data hasn't arrived</h2>
	<p>
		An unresolved binding renders a shimmer in the <em>exact box</em> the value will occupy — the skeleton
		is the layout reservation, which is how streaming stays zero-CLS. No spinner, no blank.
	</p>
	<div class="demo" style="display: flex; flex-direction: column; gap: 0.5rem;">
		<span class="auri-skeleton" style="width: 5.5ch; height: 2rem;"></span>
		<span class="auri-skeleton" style="width: 12ch; height: 0.875rem;"></span>
	</div>

	<h2>Empty — the data arrived, and there is none</h2>
	<p>
		An empty collection is a designed quiet state, never a blank hole. Components that earn it
		(DataTable, Timeline) take an <code>emptyText</code> prop; the voice is factual and lowercase:
	</p>
	<div
		class="demo"
		style="text-align: center; font-size: 0.875rem; color: var(--auri-on-surface-variant); padding: 2rem 1.25rem;"
	>
		No deploys yet today.
	</div>

	<h2>Error — the data is the wrong shape</h2>
	<p>
		A binding that resolves to something type-invalid renders the component's neutral resting state
		and logs a console warning. Never a throw, never garbage on screen — the same log-and-skip
		philosophy the renderer applies to unknown components.
	</p>

	<h2>The wire side</h2>
	<p>
		These states exist because the vocabulary encourages binding over re-sending: agents are taught
		to reference <code>&#123;"path"&#125;</code> values and update the data model, so a component's life
		has phases. The prompt-pack documents this; the components honor it.
	</p>
</div>
