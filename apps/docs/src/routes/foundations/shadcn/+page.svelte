<script lang="ts">
	import Copy from '$lib/Copy.svelte';

	const bridge = `/* auri ← shadcn bridge — paste after your shadcn theme (e.g. globals.css). */
:root {
	--auri-surface: var(--background);
	--auri-surface-container: var(--card);
	--auri-surface-container-high: var(--muted);
	--auri-on-surface: var(--foreground);
	--auri-on-surface-variant: var(--muted-foreground);
	--auri-outline-variant: var(--border);

	--auri-primary: var(--primary);
	--auri-on-primary: var(--primary-foreground);
	--auri-primary-container: color-mix(in oklab, var(--primary) 10%, var(--background));
	--auri-on-primary-container: var(--primary);

	--auri-shape-sm: calc(var(--radius) - 4px);
	--auri-shape-md: var(--radius);
	--auri-shape-lg: calc(var(--radius) + 4px);

	/* optional — adopt your chart palette (auri keeps its sixth) */
	--auri-chart-1: var(--chart-1);
	--auri-chart-2: var(--chart-2);
	--auri-chart-3: var(--chart-3);
	--auri-chart-4: var(--chart-4);
	--auri-chart-5: var(--chart-5);
}

/* Dark tunes the two derived primary tones; scope to your dark selector. */
.dark {
	--auri-primary-container: color-mix(in oklab, var(--primary) 16%, var(--background));
	--auri-on-primary-container: color-mix(in oklab, var(--primary) 55%, white);
}`;

	const mirror = `const toggle = () => {
	document.documentElement.classList.toggle('dark', isDark);
	document.documentElement.classList.toggle('a2ui-dark', isDark); // one added line
};`;
</script>

<svelte:head>
	<title>auri — using auri with shadcn</title>
	<meta
		name="description"
		content="The token bridge: auri's agent-emitted surfaces inherit a shadcn/ui app's theme, so both lanes read as one system."
	/>
</svelte:head>

<div class="doc">
	<h1>Using auri with shadcn</h1>
	<p class="lede">
		auri is not a shadcn alternative — it is the other lane. shadcn/ui is the chrome humans write:
		navigation, settings, dialogs. auri is the surfaces agents emit over the wire at runtime. A real
		product has both, and they should read as one system. This page is the bridge that makes that
		mechanical.
	</p>

	<h2>Why this is easy</h2>
	<p>
		auri's Foundation adopts shadcn/ui v4's values on purpose: the same chroma-zero oklch neutrals,
		the same hairline-in-light / white-alpha-in-dark border treatment, a radius scale built around
		shadcn's own <code>0.625rem</code> base. On a stock shadcn theme the bridge below is a near no-op
		— it starts mattering the moment you customize your theme, because from then on auri follows your
		values instead of merely resembling them.
	</p>
	<p>
		It also works without ceremony because auri's tokens ship at <code>:where()</code> zero specificity
		by design — any declaration in your own stylesheet outranks them. Overriding is the supported customization
		path, not a fight with the cascade.
	</p>

	<h2>The one-variable path</h2>
	<p>
		If all you want is auri in your brand color, skip the bridge: set
		<code>--auri-seed</code> (light) and <code>--auri-seed-dark</code> (dark) and every primary tone
		— buttons, focus rings, tinted containers — reseeds from those two values. The full bridge is
		for apps that want auri to inherit the <em>whole</em> shadcn theme: ground, cards, borders, radius,
		charts.
	</p>

	<h2>The bridge, two steps</h2>
	<p>
		<strong>1 — mirror the dark class.</strong> shadcn toggles <code>.dark</code>; auri's renderer
		keys off <code>.a2ui-dark</code>. Set both in your theme toggle:
	</p>
	<pre>{mirror}</pre>
	<p>
		This flips everything the token bridge doesn't carry — the five intents, skeleton shimmer,
		hover/press state layers. Without it, a dark shadcn app would get light-mode intent colors on a
		dark ground. (If you use the media-query strategy instead of a class, skip this step — auri's
		own <code>prefers-color-scheme</code> block already tracks it.)
	</p>
	<p>
		<strong>2 — paste the token bridge</strong> after your shadcn theme. Colors flip with your theme
		automatically, because every bridged value points at a shadcn variable that itself changes under
		<code>.dark</code>:
	</p>
	<pre>{bridge}</pre>
	<p><Copy text={bridge} label="copy the bridge" /></p>

	<h2>The mapping</h2>
	<table>
		<thead>
			<tr><th>auri role</th><th>shadcn variable</th><th>note</th></tr>
		</thead>
		<tbody>
			<tr
				><td><code>--auri-surface</code></td><td><code>--background</code></td><td
					>the page ground</td
				></tr
			>
			<tr
				><td><code>--auri-surface-container</code></td><td><code>--card</code></td><td
					>cards: Stat, Chart, ApprovalCard…</td
				></tr
			>
			<tr
				><td><code>--auri-surface-container-high</code></td><td><code>--muted</code></td><td
					>muted fills, code insets</td
				></tr
			>
			<tr
				><td><code>--auri-on-surface</code></td><td><code>--foreground</code></td><td
					>primary text</td
				></tr
			>
			<tr
				><td><code>--auri-on-surface-variant</code></td><td><code>--muted-foreground</code></td><td
					>labels, captions</td
				></tr
			>
			<tr
				><td><code>--auri-outline-variant</code></td><td><code>--border</code></td><td>hairlines</td
				></tr
			>
			<tr
				><td><code>--auri-primary</code> family</td><td><code>--primary</code> family</td><td
					>containers derived via <code>color-mix</code></td
				></tr
			>
			<tr
				><td><code>--auri-shape-sm/md/lg</code></td><td><code>--radius</code> ±4px</td><td
					>shadcn's own calc pattern</td
				></tr
			>
			<tr
				><td><code>--auri-chart-1…5</code></td><td><code>--chart-1…5</code></td><td
					>optional; auri keeps its sixth</td
				></tr
			>
		</tbody>
	</table>

	<h2>What deliberately stays auri</h2>
	<ul>
		<li>
			<strong>The five intents.</strong> <code>good / bad / warning / info / neutral</code> is the
			design signature agents rely on, and shadcn has no counterpart scale —
			<code>--destructive</code> maps to roughly one fifth of it. The intent trios stay auri's and
			flip with <code>.a2ui-dark</code> (step 1).
		</li>
		<li>
			<strong>Input fill.</strong> Not bridged because the defaults already agree: transparent hairline
			inputs in light, translucent white-alpha fills in dark — auri adopted shadcn's treatment outright.
		</li>
		<li>
			<strong>Motion, skeletons, type roles.</strong> No shadcn counterpart exists; they are part of what
			a catalog promises an agent (in-between states are contract concerns), so they ship with auri.
		</li>
		<li>
			<strong>Fonts need no bridge.</strong> auri components inherit the host font stack — a shadcn
			app that sets Geist (or anything else) on <code>body</code> is already done.
		</li>
	</ul>
</div>
