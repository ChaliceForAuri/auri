<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>auri — atoms and catalogs</title>
</svelte:head>

<div class="doc">
	<h1>Atoms and catalogs</h1>
	<p class="lede">
		The obvious question about auri's architecture: why ship curated catalogs instead of a bag of
		atoms you compose yourself? Because our components have two consumers — and the second one is a
		language model with a context window.
	</p>

	<h2>Every component is an atom</h2>
	<p>
		Under the hood, auri is atoms-first: every component is independently importable (<code
			>import &#123; Stat &#125; from '@aurilabs/ops'</code
		>), tree-shakeable, free of cross-component dependencies, and drawing from the same
		<code>@aurilabs/core</code> tokens. And atoms live once — if a future catalog needs a component another
		one has, it references the same atom, never a fork.
	</p>

	<h2>Why atoms alone aren't enough</h2>
	<p>
		A human developer browses docs and imports what they need. An agent can't — it only speaks a
		vocabulary that has been <em>taught to it</em>, in its system prompt, before the conversation
		starts. That changes the economics of "just pick what you want":
	</p>
	<ul>
		<li>
			<strong>Context is a budget.</strong> Every component in the prompt-pack costs tokens on every request,
			forever.
		</li>
		<li>
			<strong>Choice dilutes reliability.</strong> Models emit small, coherent vocabularies cleanly; sprawling
			menus breed prop confusion and hallucinated components. Our emission gate measures this on every
			change.
		</li>
		<li>
			<strong>Trust is a set property.</strong> "These twelve components, taught by this exact pack,
			emit cleanly across model families" is a claim about the <em>collection</em> — it can't be inherited
			by an untested hand-rolled subset.
		</li>
	</ul>
	<p>
		A catalog is the answer to all three at once: the subset an agent needs, taught coherently (one
		intent scale, one action idiom, shared rules), evaluated as a set, versioned at a stable URL
		that agents can cache.
	</p>

	<h2>A catalog is three thin artifacts over the atoms</h2>
	<ul>
		<li><strong>The contract</strong> — a JSON Schema scoping exactly this set of components.</li>
		<li>
			<strong>The prompt-pack</strong> — the teaching text for exactly this set, evals included.
		</li>
		<li><strong>The registration</strong> — one object handing the set to the renderer.</li>
	</ul>
	<p>
		That's it. The catalog isn't a wall around the atoms; it's the packaging that makes them
		teachable and testable for models.
	</p>

	<h2>Catalogs mix — by design, today</h2>
	<p>Mixing is the protocol's sanctioned mechanism, not a special case:</p>
	<pre><code
			>const catalog = createCatalogRegistry([basicCatalog, opsCatalog /*, formsCatalog */]);</code
		></pre>
	<p>
		Components from every registered catalog coexist on one surface — the console on this site's
		front page mixes basic-catalog layout with ops components in every frame. A future
		<code>forms</code> catalog slots in identically.
	</p>

	<h2>ops, concretely</h2>
	<p>
		<code>ops</code> is short for operations: the vocabulary agents use to
		<em>report, monitor, and ask permission</em> — stats, charts, tables, timelines, logs, approvals.
		It's the first catalog because it's the shape of nearly every agent-to-human conversation about work
		in progress.
	</p>

	<h2>Compose your own</h2>
	<p>
		The end state honors both instincts: curated catalogs as the front door, and the
		<a href="{base}/composer">catalog composer</a> for teams that want their own vocabulary — pick
		atoms across catalogs, get a generated contract, a merged prompt-pack, and an emission-eval run
		against <em>your</em> composition. Ownership of the vocabulary itself, with the same evidence behind
		it.
	</p>
</div>
