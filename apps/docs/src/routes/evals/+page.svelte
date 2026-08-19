<script lang="ts">
	import data from '$lib/eval-data.json';

	const label = (r: string | undefined) => (r === 'pass' ? '✓' : r === 'fail' ? '✕' : '—');
</script>

<svelte:head>
	<title>auri — emission evals</title>
</svelte:head>

<div class="doc">
	<h1>Emission evals</h1>
	<p class="lede">
		The product claim behind every auri catalog: language models emit this vocabulary cleanly, cold.
		This page is the evidence — the same harness that gates our releases, its results published.
		Last updated {data.updated}.
	</p>

	<h2>The matrix</h2>
	<table>
		<thead>
			<tr>
				<th>Scenario</th>
				{#each data.models as m (m.model)}
					<th>{m.model}</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#each data.scenarios as s (s)}
				<tr>
					<td><code>{s}</code></td>
					{#each data.models as m (m.model)}
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
				{#each data.models as m (m.model)}
					<td style="font-size: 0.75rem; color: var(--auri-on-surface-variant);"
						>{m.protocol}<br />{m.date}</td
					>
				{/each}
			</tr>
		</tbody>
	</table>
	<p style="font-size: 0.8125rem; color: var(--auri-on-surface-variant);">
		✓ zero schema errors · ✕ failed validation · — not yet run for this model
	</p>

	<h2>What a pass means</h2>
	<p>
		The model receives the <a href="https://chaliceforauri.github.io/auri/catalogs/ops/prompt.md"
			>prompt-pack</a
		>
		as its system prompt — no other context, no retries, no examples beyond what the pack itself
		teaches — and one realistic scenario ("show the on-call engineer an incident view…"). Its entire
		output is validated line-by-line against the
		<a href="https://chaliceforauri.github.io/auri/catalogs/ops/v1.json">contract</a> with the same ajv
		validator our CI uses. A pass is zero schema errors across the full emission.
	</p>

	<h2>Two protocols</h2>
	<ul>
		<li>
			<strong>harness</strong> — automated: <code>npm run eval</code> in
			<code>packages/ops</code> sends the pack cold via the provider's API and scores the result. Reproducible
			by anyone with an API key.
		</li>
		<li>
			<strong>fresh-session</strong> — the original gate protocol: the pack pasted into a fresh
			model session by hand, output scored with the same validator. Documented run-by-run in the
			<a href="https://github.com/ChaliceForAuri/auri/blob/main/packages/ops/contract/README.md"
				>gate log</a
			>, which also records every contract fix these runs produced.
		</li>
	</ul>

	<h2>Run it yourself</h2>
	<pre><code
			>cd packages/ops
OPENAI_API_KEY=... npm run eval -- --models openai:gpt-5.6</code
		></pre>
	<p>
		The harness lives at
		<a href="https://github.com/ChaliceForAuri/auri/blob/main/packages/ops/scripts/emission-eval.js"
			>scripts/emission-eval.js</a
		> — providers activate on env keys (Anthropic, OpenAI, Gemini), and results include the raw transcripts.
		Scores on this page are regenerated from real runs, never edited by hand.
	</p>
</div>
