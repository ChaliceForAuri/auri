<script lang="ts">
	import { untrack } from 'svelte';
	import { base } from '$app/paths';
	import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
	import { opsCatalog } from '@aurilabs/ops';
	import { formsCatalog } from '@aurilabs/forms';
	import { intelCatalog } from '@aurilabs/intel';
	import { componentDoc } from '$lib/components-data';
	import Copy from '$lib/Copy.svelte';

	let { data } = $props();

	const catalog = createCatalogRegistry([opsCatalog, formsCatalog, intelCatalog, basicCatalog]);
	const doc = $derived(componentDoc(data.name));

	/**
	 * The wire scrubber: position k = the first k messages ingested. Forward
	 * motion ingests incrementally (only new components animate in); backward
	 * motion rebuilds a fresh client and remounts — deterministic both ways.
	 */
	let position = $state(0);
	let playing = $state(true);
	let rebuild = $state(0);
	let client = $state(new A2uiClient());

	function rebuildTo(k: number) {
		const next = new A2uiClient();
		for (let i = 0; i < k; i++) next.ingest(doc.messages[i]!);
		client = next;
		rebuild += 1;
	}

	function seek(k: number) {
		k = Math.max(0, Math.min(k, doc.messages.length));
		if (k > position) {
			for (let i = position; i < k; i++) client.ingest(doc.messages[i]!);
		} else if (k < position) {
			rebuildTo(k);
		}
		position = k;
	}

	// New component page (client-side nav): reset the stream. untrack, or the
	// `rebuild += 1` read-modify-write makes this effect depend on itself.
	$effect(() => {
		doc.name;
		untrack(() => {
			rebuildTo(0);
			position = 0;
			playing = true;
		});
	});

	// Autoplay walks the stream; scrubbing pauses it.
	$effect(() => {
		if (!playing || position >= doc.messages.length) return;
		const timer = setTimeout(() => seek(position + 1), 750);
		return () => clearTimeout(timer);
	});

	const atEnd = $derived(position >= doc.messages.length);
</script>

<svelte:head>
	<title>auri — {doc.name}</title>
	<meta name="description" content="{doc.name}: {doc.description}" />
</svelte:head>

<nav class="crumbs" aria-label="breadcrumb">
	<a href="{base}/components">components</a> / <span>{doc.catalog}</span> / <span>{doc.name}</span>
</nav>

<section class="intro">
	<h1>{doc.name}</h1>
	<p>{doc.description}</p>
</section>

<section class="stage-grid">
	<div class="pane render-pane">
		<div class="pane-head">
			<span>rendered, live</span>
			<div class="controls">
				<button
					type="button"
					onclick={() => {
						if (atEnd) {
							rebuildTo(0);
							position = 0;
							playing = true;
						} else {
							playing = !playing;
						}
					}}>{atEnd ? 'replay' : playing ? 'pause' : 'play'}</button
				>
			</div>
		</div>
		<div class="canvas">
			{#key rebuild}
				<Surface {client} {catalog} surfaceId={doc.surfaceId} />
			{/key}
		</div>
		<label class="scrubber">
			<span class="auri-sr-only">scrub the wire</span>
			<input
				type="range"
				min="0"
				max={doc.messages.length}
				value={position}
				oninput={(e) => {
					playing = false;
					seek(Number(e.currentTarget.value));
				}}
			/>
			<span class="pos">{position} / {doc.messages.length}</span>
		</label>
	</div>

	<div class="pane wire-pane">
		<div class="pane-head">
			<span>the wire — click a line to scrub</span>
			<Copy text={doc.fixtureText} label="copy JSONL" />
		</div>
		<ol class="wire">
			{#each doc.messages as message, i (i)}
				{@const kind = Object.keys(message).find((k) => k !== 'version') ?? 'message'}
				<li>
					<button
						type="button"
						class="line"
						class:sent={i < position}
						class:current={i === position - 1}
						onclick={() => {
							playing = false;
							seek(i + 1);
						}}
					>
						<span class="kind">{kind}</span>
						<code>{JSON.stringify(message)}</code>
					</button>
				</li>
			{/each}
		</ol>
	</div>
</section>

<section class="artifact-grid">
	<div class="pane">
		<div class="pane-head">
			<span>the contract — {doc.name} in catalog.json</span>
			<Copy text={doc.contractExcerpt} label="copy schema" />
		</div>
		<pre>{doc.contractExcerpt}</pre>
	</div>
	<div class="pane">
		<div class="pane-head">
			<span>the prompt-pack — paste into your agent</span>
			<Copy text={doc.promptSnippet} label="copy snippet" />
		</div>
		<pre>{doc.promptSnippet}</pre>
	</div>
</section>

<style>
	.crumbs {
		padding-top: 1.5rem;
		font-size: 0.8125rem;
		color: var(--a2ui-color-text-muted);
	}
	.crumbs a {
		color: inherit;
	}

	.intro {
		max-width: 44rem;
		padding: 0.5rem 0 1.25rem;
	}
	h1 {
		margin: 0 0 0.35rem;
		font-size: 1.6rem;
		letter-spacing: -0.02em;
	}
	.intro p {
		margin: 0;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}

	.stage-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
		gap: 1rem;
		align-items: stretch;
	}
	.artifact-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 24rem), 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}
	@media (max-width: 56rem) {
		.stage-grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.pane {
		display: flex;
		flex-direction: column;
		min-width: 0;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
	}

	.pane-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-bottom: 1px solid var(--a2ui-color-border);
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
	}

	.controls button {
		font: inherit;
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
		background: transparent;
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius-small);
		padding: 0.1rem 0.6rem;
		cursor: pointer;
	}
	.controls button:hover {
		color: var(--a2ui-color-text);
	}

	.render-pane .canvas {
		flex: 1;
		min-height: 16rem;
		padding: 0.5rem;
		background: var(--a2ui-color-surface);
		border-radius: 0;
	}

	.scrubber {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--a2ui-color-border);
	}
	.scrubber input {
		flex: 1;
		accent-color: var(--a2ui-color-primary);
	}
	.pos {
		font-size: var(--auri-type-caption-size);
		color: var(--a2ui-color-text-muted);
		font-variant-numeric: tabular-nums;
	}

	.wire {
		list-style: none;
		margin: 0;
		padding: 0.5rem;
		overflow-y: auto;
		max-height: 30rem;
	}
	.line {
		all: unset;
		display: block;
		width: 100%;
		box-sizing: border-box;
		cursor: pointer;
		padding: 0.4rem 0.5rem;
		border-radius: var(--a2ui-radius-small);
		border-inline-start: 2px solid transparent;
		opacity: 0.45;
	}
	.line:hover {
		background: rgb(150 150 150 / 0.08);
	}
	.line:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
	}
	.line.sent {
		opacity: 1;
	}
	.line.current {
		border-inline-start-color: var(--a2ui-color-primary);
		background: rgb(150 150 150 / 0.08);
	}
	.line .kind {
		display: block;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.6875rem;
		color: var(--a2ui-color-primary);
	}
	.line code {
		display: block;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.6875rem;
		line-height: 1.5;
		color: var(--a2ui-color-text-muted);
		overflow-wrap: anywhere;
	}

	pre {
		margin: 0;
		padding: 0.75rem;
		overflow: auto;
		max-height: 26rem;
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.75rem;
		line-height: 1.55;
		color: var(--a2ui-color-text);
		tab-size: 2;
	}
</style>
