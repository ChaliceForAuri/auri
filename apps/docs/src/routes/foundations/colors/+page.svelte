<svelte:head>
	<title>auri — colors</title>
</svelte:head>

<div class="doc">
	<h1>Colors</h1>
	<p class="lede">
		Content is the color. The ground is pure gray (zero chroma), one green accent marks actions, and
		the five intents appear only where the agent made a judgment. Every swatch below renders from
		the live tokens — toggle dark in the header and they follow.
	</p>

	<h2 id="the-budget">The budget</h2>
	<p>
		Green appears on primary actions, links, focus rings, and the wordmark — nowhere else. Intent
		color appears only on judged content: a badge, a delta chip, a callout title. Everything else is
		neutral, which is why the color you do see means something.
	</p>

	<h2>Neutral roles</h2>
	<table>
		<thead>
			<tr><th></th><th>Token</th><th>Role</th></tr>
		</thead>
		<tbody>
			<tr>
				<td><span class="swatch" style="background: var(--auri-surface)"></span></td>
				<td><code>--auri-surface</code></td>
				<td>the page ground</td>
			</tr>
			<tr>
				<td><span class="swatch" style="background: var(--auri-surface-container)"></span></td>
				<td><code>--auri-surface-container</code></td>
				<td>cards (with a hairline)</td>
			</tr>
			<tr>
				<td><span class="swatch" style="background: var(--auri-surface-container-high)"></span></td>
				<td><code>--auri-surface-container-high</code></td>
				<td>muted fills: code blocks, tracks, secondary buttons</td>
			</tr>
			<tr>
				<td><span class="swatch" style="background: var(--auri-on-surface)"></span></td>
				<td><code>--auri-on-surface</code></td>
				<td>text</td>
			</tr>
			<tr>
				<td><span class="swatch" style="background: var(--auri-on-surface-variant)"></span></td>
				<td><code>--auri-on-surface-variant</code></td>
				<td>secondary text: labels, captions, table headers</td>
			</tr>
			<tr>
				<td><span class="swatch" style="background: var(--auri-outline-variant)"></span></td>
				<td><code>--auri-outline-variant</code></td>
				<td>the hairline — card borders, dividers (white-alpha in dark)</td>
			</tr>
		</tbody>
	</table>

	<h2>Primary — green, the color of healthy</h2>
	<div class="demo" style="display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap;">
		<span
			style="background: var(--auri-primary); color: var(--auri-on-primary); font-size: 0.875rem; font-weight: 500; padding: 0.45rem 1.1rem; border-radius: var(--auri-shape-md);"
			>Primary action</span
		>
		<span
			style="background: var(--auri-primary-container); color: var(--auri-on-primary-container); font-size: 0.875rem; font-weight: 500; padding: 0.45rem 1.1rem; border-radius: var(--auri-shape-md);"
			>Tinted</span
		>
		<a href="#the-budget" style="color: var(--auri-primary); font-size: 0.875rem; font-weight: 500;"
			>A link</a
		>
	</div>
	<p>
		In an ops catalog, the brand color and the good-news color are deliberately the same green: the
		product's accent is the color of systems being okay. <code>--auri-primary</code> is Tailwind emerald-700
		in light and emerald-400 in dark.
	</p>

	<h2>Intents</h2>
	<p>
		Five judgments, one grammar: <strong
			>strong color for text and lines, soft tint for the chip behind it.</strong
		> Filled full-strength intent containers don't exist in this system.
	</p>
	<div class="demo" style="display: flex; gap: 0.6rem; flex-wrap: wrap;">
		<span
			style="background: var(--auri-intent-good-container); color: var(--auri-on-intent-good-container); font-size: 0.8125rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: var(--auri-shape-sm);"
			>good</span
		>
		<span
			style="background: var(--auri-intent-bad-container); color: var(--auri-on-intent-bad-container); font-size: 0.8125rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: var(--auri-shape-sm);"
			>bad</span
		>
		<span
			style="background: var(--auri-intent-warning-container); color: var(--auri-on-intent-warning-container); font-size: 0.8125rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: var(--auri-shape-sm);"
			>warning</span
		>
		<span
			style="background: var(--auri-intent-info-container); color: var(--auri-on-intent-info-container); font-size: 0.8125rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: var(--auri-shape-sm);"
			>info</span
		>
		<span
			style="background: var(--auri-intent-neutral-container); color: var(--auri-on-intent-neutral-container); font-size: 0.8125rem; font-weight: 600; padding: 0.2rem 0.7rem; border-radius: var(--auri-shape-sm);"
			>neutral</span
		>
	</div>
	<p>
		Semantics: <code>good</code> healthy · <code>bad</code> failing · <code>warning</code> needs
		attention · <code>info</code> informational · <code>neutral</code> no claim (the default).
		Agents emit these five words on the wire — never a color. <code>intent</code> judges;
		<code>trend</code> describes; they are independent axes.
	</p>

	<h2>Reseeding</h2>
	<pre><code
			>:root &#123;
	--auri-seed: #7c3aed; /* your brand — drives primary + its tint */
&#125;</code
		></pre>
	<p>
		The neutral ground is deliberately fixed (pure gray belongs to everyone); the accent is yours.
		Intent hues are also tokens if your product needs different ones.
	</p>

	<h2>Provenance</h2>
	<p>
		Neutral values are adopted verbatim from <a href="https://ui.shadcn.com">shadcn/ui</a> v4 (MIT)
		— chroma-zero oklch, white-alpha borders in dark. Intent values come from Tailwind's open color
		scales. Contrast: WCAG 2.2 AA in both themes for every text pairing;
		<code>forced-colors</code> maps intents to system colors.
	</p>
</div>
