<script lang="ts">
	import { untrack } from 'svelte';
	import { A2uiClient, Surface, createCatalogRegistry, basicCatalog } from 'svelte-a2ui';
	import type { AgentToRenderer } from 'svelte-a2ui';
	import { opsCatalog } from '@aurilabs/ops';
	import { formsCatalog } from '@aurilabs/forms';
	import Copy from '$lib/Copy.svelte';
	import data from '$lib/playground-data.json';

	const catalog = createCatalogRegistry([opsCatalog, formsCatalog, basicCatalog]);

	const scenarios = data.scenarios.map((s) => ({
		...s,
		messages: s.lines.map((l) => JSON.parse(l) as AgentToRenderer)
	}));

	let selected = $state(0);
	const scenario = $derived(scenarios[selected]!);
	const surfaceId = $derived(
		scenario.messages.find((m) => m.createSurface)?.createSurface?.surfaceId ?? 'main'
	);

	// The wire scrubber, same contract as the component pages: position k = the
	// first k messages ingested; forward ingests incrementally, backward rebuilds.
	let position = $state(0);
	let playing = $state(true);
	let rebuild = $state(0);
	let client = $state(new A2uiClient());

	function rebuildTo(k: number) {
		const next = new A2uiClient();
		for (let i = 0; i < k; i++) next.ingest(scenario.messages[i]!);
		client = next;
		rebuild += 1;
	}

	function seek(k: number) {
		k = Math.max(0, Math.min(k, scenario.messages.length));
		if (k > position) {
			for (let i = position; i < k; i++) client.ingest(scenario.messages[i]!);
		} else if (k < position) {
			rebuildTo(k);
		}
		position = k;
	}

	// Switching scenarios resets the stream. untrack, or the rebuild counter's
	// read-modify-write makes this effect depend on itself.
	$effect(() => {
		scenario.id;
		untrack(() => {
			rebuildTo(0);
			position = 0;
			playing = true;
		});
	});

	// Autoplay walks the stream; scrubbing pauses it.
	$effect(() => {
		if (!playing || position >= scenario.messages.length) return;
		const timer = setTimeout(() => seek(position + 1), 900);
		return () => clearTimeout(timer);
	});

	const atEnd = $derived(position >= scenario.messages.length);
</script>

<svelte:head>
	<title>auri — playground</title>
	<meta
		name="description"
		content="Six realistic ops asks, answered by a real model cold. Every stream is the unedited output of {data.model}, replayed into a live surface."
	/>
</svelte:head>

<section class="intro">
	<h1>Playground</h1>
	<p>
		Twelve realistic asks from the emission-eval suites — six ops, six forms — each answered by
		<strong>{data.model}</strong> cold: the catalog's prompt-pack as system prompt, the ask below as
		the only user message, captured by the harness and replayed here <em>unedited</em>. This is the
		product claim in running form: models emit these vocabularies without fine-tuning or retries.
	</p>
</section>

<div class="picker" role="tablist" aria-label="scenarios">
	{#each scenarios as s, i (s.id)}
		<button
			type="button"
			role="tab"
			aria-selected={i === selected}
			class:active={i === selected}
			onclick={() => (selected = i)}><span class="cat">{s.catalog}</span>{s.title}</button
		>
	{/each}
</div>

<section class="ask">
	<div class="pane-head">
		<span>the ask — the only user message the model saw</span>
		<Copy text={scenario.prompt} label="copy prompt" />
	</div>
	<p>{scenario.prompt}</p>
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
				<Surface {client} {catalog} {surfaceId} />
			{/key}
		</div>
		<label class="scrubber">
			<span class="auri-sr-only">scrub the wire</span>
			<input
				type="range"
				min="0"
				max={scenario.messages.length}
				value={position}
				oninput={(e) => {
					playing = false;
					seek(Number(e.currentTarget.value));
				}}
			/>
			<span class="pos">{position} / {scenario.messages.length}</span>
		</label>
	</div>

	<div class="pane wire-pane">
		<div class="pane-head">
			<span>the wire — {data.model}, unedited, {(scenario.ms / 1000).toFixed(1)}s</span>
			<Copy text={scenario.lines.join('\n')} label="copy JSONL" />
		</div>
		<ol class="wire">
			{#each scenario.messages as message, i (`${scenario.id}-${i}`)}
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

<style>
	.intro {
		max-width: 44rem;
		padding: 1.5rem 0 1rem;
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

	.picker {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		padding-bottom: 1rem;
	}
	.picker button {
		font: inherit;
		font-size: 0.8125rem;
		font-weight: 500;
		color: var(--auri-on-surface-variant);
		background: transparent;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-pill);
		padding: 0.3rem 0.85rem;
		cursor: pointer;
		transition: color var(--auri-motion-fast) var(--auri-ease-out);
	}
	.picker button:hover {
		color: var(--auri-on-surface);
	}
	.picker button.active {
		color: var(--auri-on-primary-container);
		background: var(--auri-primary-container);
		border-color: transparent;
	}
	.picker .cat {
		font-family: var(--a2ui-font-family-monospace);
		font-size: 0.6875rem;
		opacity: 0.65;
		margin-inline-end: 0.4rem;
	}

	.ask {
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
		margin-bottom: 1rem;
	}
	.ask p {
		margin: 0;
		padding: 0.75rem;
		font-size: 0.84375rem;
		line-height: 1.6;
		color: var(--a2ui-color-text-muted);
	}

	.stage-grid {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 26rem);
		gap: 1rem;
		align-items: stretch;
		padding-bottom: 2rem;
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
		max-height: 34rem;
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
</style>
