<svelte:head>
	<title>auri — accessibility</title>
</svelte:head>

<div class="doc">
	<h1>Accessibility</h1>
	<p class="lede">
		Agent-composed pages don't exist until runtime, so they can't be audited page-by-page the way
		hand-built products are. auri's answer: make inaccessible output <em
			>inexpressible in the vocabulary</em
		> — the contract does the enforcing, before any pixel renders.
	</p>

	<h2>Names are required by schema</h2>
	<p>
		A component cannot be emitted without its accessible name — the JSON Schema marks these props
		required: <code>Stat.label</code>, <code>Badge.text</code>, <code>Callout.text</code>,
		<code>Chart.label</code>, <code>Sparkline.label</code>, <code>Progress.label</code>,
		<code>ApprovalCard.title</code>, and every DataTable column's <code>label</code>. An agent that
		omits them produces invalid wire, caught by the same validator that runs in CI.
	</p>

	<h2>Graphics describe themselves</h2>
	<p>
		Charts and sparklines generate a text alternative from their own data — "6 readings, latest 214,
		range 175 to 260" — so a screen reader hears the trend, not "image". The summary is computed,
		not an optional prop someone forgets.
	</p>

	<h2>Native semantics</h2>
	<ul>
		<li>
			DataTable is a real <code>&lt;table&gt;</code> with a <code>&lt;caption&gt;</code> and
			<code>aria-sort</code> on sortable headers (which are real buttons).
		</li>
		<li>
			KeyValue is a <code>&lt;dl&gt;</code>; Timeline is an <code>&lt;ol&gt;</code>; Chart is a
			<code>&lt;figure&gt;</code> with a caption.
		</li>
		<li>
			Progress exposes <code>role="progressbar"</code> with value/min/max — and omits
			<code>aria-valuenow</code> when indeterminate, as the spec requires.
		</li>
		<li>Interactive rows respond to Enter and Space; ConfirmButton disarms on Escape and blur.</li>
	</ul>

	<h2>Never color alone</h2>
	<p>
		Every intent pairs its color with text or a glyph: callouts prepend a spoken register
		("warning:") for assistive tech, trend arrows carry sr-only descriptions, and all text pairings
		meet WCAG 2.2 AA in both themes — the bar that is also the EU legal floor under the European
		Accessibility Act.
	</p>

	<h2>Preferences are honored</h2>
	<ul>
		<li>
			<code>prefers-reduced-motion</code>: entrances become fades, stagger drops, shimmer freezes.
		</li>
		<li><code>forced-colors</code> (Windows High Contrast): intents map to system colors.</li>
		<li>
			<code>prefers-contrast: more</code>: hairlines strengthen — darker in light, brighter alpha in
			dark — rather than hues shifting.
		</li>
		<li>Focus is always visible; nothing keyboard-reachable is pointer-only.</li>
	</ul>
</div>
