<script lang="ts">
	let run = $state(0);
</script>

<svelte:head>
	<title>auri — motion</title>
</svelte:head>

<div class="doc">
	<h1>Motion</h1>
	<p class="lede">
		The signature moment of agent-driven UI is interface assembling itself as the stream arrives.
		That entrance is designed, budgeted, and interruptible — never decorative.
	</p>

	<h2>Tokens</h2>
	<table>
		<thead>
			<tr><th>Token</th><th>Value</th><th>For</th></tr>
		</thead>
		<tbody>
			<tr
				><td><code>--auri-motion-fast</code></td><td>120ms</td><td
					>micro state changes: chip color flips, hovers</td
				></tr
			>
			<tr><td><code>--auri-motion-base</code></td><td>240ms</td><td>component entrances</td></tr>
			<tr><td><code>--auri-motion-slow</code></td><td>400ms</td><td>choreographed sequences</td></tr
			>
			<tr
				><td><code>--auri-motion-stagger</code></td><td>40ms</td><td
					>per-sibling entrance delay, capped at 8</td
				></tr
			>
			<tr
				><td><code>--auri-ease-out</code></td><td><code>cubic-bezier(0.22, 1, 0.36, 1)</code></td
				><td>entrances decelerate</td></tr
			>
		</tbody>
	</table>

	<h2>The entrance</h2>
	<p>
		Fade plus an 8px rise, transform and opacity only — layout is reserved before the animation
		starts, so a streaming surface never shoves content you're reading (zero CLS, guaranteed by
		construction). Siblings that paint in one batch cascade with the stagger:
	</p>
	<div class="demo">
		<button
			type="button"
			style="font: inherit; font-size: 0.8125rem; font-weight: 500; padding: 0.3rem 0.9rem; border: 1px solid var(--auri-outline-variant); border-radius: var(--auri-shape-md); background: transparent; color: var(--auri-on-surface); cursor: pointer; margin-bottom: 0.9rem;"
			onclick={() => (run += 1)}>replay the entrance</button
		>
		{#key run}
			<div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
				{#each ['first', 'second', 'third', 'fourth'] as label (label)}
					<div
						class="auri-enter"
						style="padding: 0.8rem 1.1rem; border: 1px solid var(--auri-outline-variant); border-radius: var(--auri-shape-lg); background: var(--auri-surface-container); font-size: 0.8125rem; color: var(--auri-on-surface-variant);"
					>
						{label}
					</div>
				{/each}
			</div>
		{/key}
	</div>

	<h2>Interruptibility</h2>
	<p>
		A value that changes mid-transition retargets from wherever it currently is — a Progress fill
		glides to 7, and if 8 arrives early it bends toward 8 without snapping. Streams don't queue and
		don't jump.
	</p>

	<h2>Reduced motion</h2>
	<p>
		<code>prefers-reduced-motion</code> swaps the entrance for a fast opacity fade and drops the stagger
		entirely — feedback without movement, not silence. Skeleton shimmer freezes to a static tint.
	</p>
</div>
