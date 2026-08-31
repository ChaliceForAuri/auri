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
		for the full token surface.
	</p>

	<h3>Light and dark: three states</h3>
	<p>
		Dark keys off the renderer's classes, so one toggle drives both the basic catalog and auri's:
	</p>
	<ul>
		<li><strong>No class</strong> — follows the operating system.</li>
		<li>
			<code>.a2ui-light</code> — pinned light, <em>even on a dark OS</em>. An explicit pin always
			outranks the system preference.
		</li>
		<li><code>.a2ui-dark</code> — pinned dark.</li>
	</ul>

	<h3>If your app themes with its own class</h3>
	<p>
		Tailwind's <code>.dark</code>, a <code>data-theme</code> attribute, your own convention — auri doesn't
		see any of them. Mirror your toggle onto the two classes wherever you set it:
	</p>
	<pre><code
			>document.documentElement.classList.toggle('a2ui-dark', dark);
document.documentElement.classList.toggle('a2ui-light', !dark);</code
		></pre>
	<p>
		Skip this and your page and your components disagree: the page follows your class, the
		components follow the OS. The mismatch hides whenever the two happen to agree, so it tends to
		surface in front of an audience rather than in development — which is exactly how it was found.
	</p>
</div>
