<script lang="ts">
	import data from '$lib/eval-data.json';

	interface ModelRun {
		model: string;
		family: string;
		protocol: string;
		date: string;
		results: Record<string, string | undefined>;
	}
	interface CatalogBoard {
		key: string;
		scenarios: string[];
		models: ModelRun[];
	}

	const catalogs: CatalogBoard[] = data.catalogs;

	const label = (r: string | undefined) => (r === 'pass' ? '✓' : r === 'fail' ? '✕' : '—');
</script>

<svelte:head>
	<title>auri — emission evals</title>
</svelte:head>

<div class="doc">
	<h1>Emission evals</h1>
	<p class="lede">
		The product claim behind every auri catalog: language models emit these vocabularies cleanly,
		cold. This page is the evidence — the same harness that gates our releases, its results
		published, one matrix per catalog. Last updated {data.updated}.
	</p>

	{#each catalogs as board (board.key)}
		<h2>{board.key}</h2>
		<table>
			<thead>
				<tr>
					<th>Scenario</th>
					{#each board.models as m (m.model)}
						<th>{m.model}</th>
					{/each}
				</tr>
			</thead>
			<tbody>
				{#each board.scenarios as s (s)}
					<tr>
						<td><code>{s}</code></td>
						{#each board.models as m (m.model)}
							<td
								style="font-weight: 600; color: {m.results[s] === 'pass'
									? 'var(--auri-intent-good)'
									: m.results[s] === 'fail'
										? 'var(--auri-intent-bad)'
										: 'var(--auri-on-surface-variant)'};">{label(m.results[s])}</td
							>
						{/each}
					</tr>
				{/each}
				<tr>
					<td style="color: var(--auri-on-surface-variant);">protocol · date</td>
					{#each board.models as m (m.model)}
						<td style="font-size: 0.75rem; color: var(--auri-on-surface-variant);"
							>{m.protocol}<br />{m.date}</td
						>
					{/each}
				</tr>
			</tbody>
		</table>
	{/each}
	<p style="font-size: 0.8125rem; color: var(--auri-on-surface-variant);">
		✓ zero schema errors · ✕ failed validation · — not yet run for this model
	</p>

	<h2>What a pass means</h2>
	<p>
		The model receives the catalog's prompt-pack (<a
			href="https://chaliceforauri.github.io/auri/catalogs/ops/prompt.md">ops</a
		>
		·
		<a href="https://chaliceforauri.github.io/auri/catalogs/forms/prompt.md">forms</a>) as its
		system prompt — no other context, no retries, no examples beyond what the pack itself teaches —
		and one realistic scenario ("show the on-call engineer an incident view…"). Its entire output is
		validated line-by-line against the contract (<a
			href="https://chaliceforauri.github.io/auri/catalogs/ops/v1.json">ops</a
		>
		·
		<a href="https://chaliceforauri.github.io/auri/catalogs/forms/v1.json">forms</a>) with the same
		ajv validator our CI uses. A pass is zero schema errors across the full emission.
	</p>

	<h2>Two protocols</h2>
	<ul>
		<li>
			<strong>harness</strong> — automated: <code>npm run eval</code> in
			<code>packages/ops</code> or <code>packages/forms</code> sends the pack cold via the provider's
			API and scores the result. Reproducible by anyone with an API key.
		</li>
		<li>
			<strong>fresh-session</strong> — the original gate protocol: the pack given to a fresh model
			session with nothing else, output scored with the same validator. Documented run-by-run in the
			gate logs (<a
				href="https://github.com/ChaliceForAuri/auri/blob/main/packages/ops/contract/README.md"
				>ops</a
			>
			·
			<a href="https://github.com/ChaliceForAuri/auri/blob/main/packages/forms/contract/README.md"
				>forms</a
			>), which also record every contract fix these runs produced — including forms' component
			batching rule, found by a model failing the same way three times in a row.
		</li>
	</ul>

	<h2>Run it yourself</h2>
	<pre><code
			>cd packages/forms   # or packages/ops
OPENAI_API_KEY=... npm run eval -- --models openai:gpt-5.6</code
		></pre>
	<p>
		The shared harness lives at
		<a href="https://github.com/ChaliceForAuri/auri/blob/main/packages/ops/scripts/emission-eval.js"
			>scripts/emission-eval.js</a
		>
		— providers activate on env keys (Anthropic, OpenAI, Gemini), results include the raw
		transcripts, and the <code>--pack</code>/<code>--contract</code>/<code>--scenarios-file</code> flags
		point it at any catalog or composed vocabulary. Scores on this page are regenerated from real runs,
		never edited by hand.
	</p>
</div>
