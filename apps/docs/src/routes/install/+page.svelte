<script lang="ts">
	import { base } from '$app/paths';
</script>

<svelte:head>
	<title>auri — install</title>
</svelte:head>

<div class="doc">
	<h1>Install</h1>
	<p class="lede">
		Three artifacts, one install: the Svelte components from npm, the contract your wire validates
		against, and the prompt-pack that teaches your agent to speak the vocabulary.
	</p>

	<h2>1 · The components</h2>
	<pre><code>npm i @aurilabs/ops svelte-a2ui</code></pre>
	<p><code>svelte</code> (v5) and <code>svelte-a2ui</code> are peer dependencies.</p>

	<h2>2 · The integration</h2>
	<pre><code
			>&lt;script lang="ts"&gt;
	import &#123; A2uiClient, Surface, createCatalogRegistry, basicCatalog &#125; from 'svelte-a2ui';
	import &#123; opsCatalog &#125; from '@aurilabs/ops';
	import 'svelte-a2ui/theme.css';
	import '@aurilabs/ops/theme.css';

	const catalog = createCatalogRegistry([basicCatalog, opsCatalog]);
	const client = new A2uiClient(&#123; transport: /* your transport */ &#125;);
	client.start();
&lt;/script&gt;

&lt;Surface &#123;client&#125; &#123;catalog&#125; surfaceId="main" /&gt;</code
		></pre>
	<p>
		Layout primitives (Row, Column, Card, List) come from the basic catalog; auri's twelve ops
		components mix with them on one surface.
	</p>

	<h2>3 · The agent</h2>
	<p>
		Paste the <a href="https://chaliceforauri.github.io/auri/catalogs/ops/prompt.md">prompt-pack</a>
		into your agent's system prompt. That's the teaching text — every component, every rule, every trap,
		validated cold against multiple model families before anything shipped.
	</p>

	<h2>The artifacts, at stable URLs</h2>
	<ul>
		<li>
			<a href="https://chaliceforauri.github.io/auri/catalogs/ops/v2.json">catalog.json</a> — the contract;
			this URL is the catalog id agents reference
		</li>
		<li>
			<a href="https://chaliceforauri.github.io/auri/catalogs/ops/prompt.md">prompt.md</a> — the prompt-pack
		</li>
		<li>
			<a href="https://chaliceforauri.github.io/auri/catalogs/ops/examples/incident-brief.jsonl"
				>examples/*.jsonl</a
			> — known-good streams, one per component
		</li>
		<li>
			<a href="https://chaliceforauri.github.io/auri/llms.txt">llms.txt</a> — the map of all of it, for
			agents
		</li>
	</ul>

	<h2>Theming</h2>
	<p>
		Everything is CSS custom properties at zero specificity — your stylesheet wins by default. Set
		<code>--auri-seed</code> for your accent; see <a href="{base}/foundations/colors">colors</a>
		for the full token surface. Dark mode keys off the renderer's <code>.a2ui-dark</code> class.
	</p>
</div>
