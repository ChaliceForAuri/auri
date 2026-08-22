<script lang="ts">
	import { getRenderContext } from 'svelte-a2ui';
	import type { Action, ComponentSpec, Scope } from 'svelte-a2ui';
	import { withSubject } from '../subject.js';
	import { formatClock } from '../format.js';

	interface Line {
		startSeconds: number;
		speaker?: string;
		text: string;
	}

	interface Props {
		label?: unknown;
		mediaUrl?: unknown;
		mediaKind?: unknown;
		posterUrl?: unknown;
		durationSeconds?: unknown;
		captionsUrl?: unknown;
		transcript?: unknown;
		/** Registered `raw`: startSeconds merged before dispatch. */
		seekAction?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let {
		label,
		mediaUrl,
		mediaKind,
		posterUrl,
		durationSeconds,
		captionsUrl,
		transcript,
		seekAction,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

	// undefined -> transcription binding unresolved; [] -> processing (both are
	// COMMON states, not errors — transcription runs async (issue #22)).
	const lines: Line[] | undefined = $derived(
		Array.isArray(transcript)
			? (transcript as Line[]).filter(
					(l) =>
						l &&
						typeof l === 'object' &&
						typeof l.startSeconds === 'number' &&
						typeof l.text === 'string'
				)
			: undefined
	);

	let media = $state<HTMLMediaElement | null>(null);
	let currentTime = $state(0);
	let mediaFailed = $state(false);

	const activeIndex = $derived.by(() => {
		if (!lines || lines.length === 0) return -1;
		let active = -1;
		for (let i = 0; i < lines.length; i++) {
			if (lines[i]!.startSeconds <= currentTime) active = i;
			else break;
		}
		return active;
	});

	/* Auto-follow yields the moment the user scrolls (issue #22). */
	let following = $state(true);
	let panel = $state<HTMLElement | null>(null);
	const reducedMotion =
		typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

	$effect(() => {
		if (!following || activeIndex < 0 || !panel) return;
		const el = panel.querySelector(`[data-line="${activeIndex}"]`);
		el?.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
	});

	function seek(line: Line) {
		if (media) {
			try {
				media.currentTime = line.startSeconds;
			} catch {
				/* metadata not loaded yet — the action still tells the agent */
			}
		}
		following = true;
		if (seekAction && typeof seekAction === 'object') {
			rc.client.dispatch(
				rc.surfaceId,
				withSubject(seekAction as Action, { startSeconds: line.startSeconds }),
				a2ui.id,
				a2ui.scope
			);
		}
	}
</script>

<section
	class="auri-audit auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? String(label ?? '')}
>
	<header>
		<h3>{label}</h3>
		{#if typeof durationSeconds === 'number'}
			<span class="duration">{formatClock(durationSeconds)}</span>
		{/if}
	</header>

	<!-- Never autoplays: a dashboard that starts talking is a bug (issue #22). -->
	<div
		class="stage"
		class:failed={mediaFailed}
		data-kind={mediaKind === 'audio' ? 'audio' : 'video'}
	>
		{#if mediaFailed}
			<!-- A stated failure, never a dead black box; the transcript survives. -->
			<p class="media-failed" role="status">
				the recording could not be loaded — the link may have expired
			</p>
		{:else if mediaKind === 'audio'}
			<audio
				bind:this={media}
				controls
				preload="metadata"
				src={typeof mediaUrl === 'string' ? mediaUrl : undefined}
				ontimeupdate={() => (currentTime = media?.currentTime ?? 0)}
				onerror={() => (mediaFailed = true)}
			>
				{#if typeof captionsUrl === 'string'}
					<track kind="captions" src={captionsUrl} default />
				{/if}
			</audio>
		{:else}
			<!-- svelte-ignore a11y_media_has_caption -->
			<!-- Captions ARE provided when captionsUrl exists; without it the
			     transcript panel is the fallback the contract documents. -->
			<video
				bind:this={media}
				controls
				preload="metadata"
				src={typeof mediaUrl === 'string' ? mediaUrl : undefined}
				poster={typeof posterUrl === 'string' ? posterUrl : undefined}
				ontimeupdate={() => (currentTime = media?.currentTime ?? 0)}
				onerror={() => (mediaFailed = true)}
			>
				{#if typeof captionsUrl === 'string'}
					<track kind="captions" src={captionsUrl} default />
				{/if}
			</video>
		{/if}
	</div>

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<!-- wheel/touch listeners only DETECT scroll intent (auto-follow yields);
	     the interactive elements are the transcript line buttons inside. -->
	<div
		class="transcript"
		bind:this={panel}
		onwheel={() => (following = false)}
		ontouchmove={() => (following = false)}
	>
		{#if !lines || lines.length === 0}
			<!-- Empty is a real, common state: transcription runs async. -->
			<p class="processing">transcript still processing</p>
		{:else}
			<ol>
				{#each lines as line, i (i)}
					<li>
						<button
							type="button"
							class="line"
							data-line={i}
							aria-current={activeIndex === i ? 'true' : undefined}
							onclick={() => seek(line)}
						>
							<span class="time">{formatClock(line.startSeconds)}</span>
							{#if line.speaker}<span class="speaker">{line.speaker}</span>{/if}
							<span class="text">{line.text}</span>
						</button>
					</li>
				{/each}
			</ol>
		{/if}
	</div>
</section>

<style>
	.auri-audit {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
		overflow: hidden;
	}

	header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.85rem 1.1rem 0.5rem;
	}
	h3 {
		margin: 0;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}
	.duration {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}

	/* The stage reserves its box from kind + durationSeconds alone — media
	   metadata never shifts layout (issue #22, zero CLS). */
	.stage[data-kind='video'] {
		aspect-ratio: 16 / 9;
		background: oklch(0.145 0 0);
	}

	/* Nothing is going to letterbox, so stop reserving a letterbox: a failed
	   stage drops the black ground and reads on the card surface. Issue #22
	   asked for a stated failure and NEVER a dead black box — the axe audit
	   caught that we had shipped both (muted text on the dark stage). */
	.stage.failed {
		aspect-ratio: auto;
		min-height: 4rem;
		background: var(--auri-surface-container-high);
	}
	.stage[data-kind='audio'] {
		padding: 0.5rem 1.1rem;
	}
	video {
		display: block;
		width: 100%;
		height: 100%;
	}
	audio {
		display: block;
		width: 100%;
	}
	.media-failed {
		margin: 0;
		display: grid;
		place-items: center;
		height: 100%;
		min-height: 4rem;
		font-size: 0.875rem;
		color: var(--auri-on-surface-variant);
	}

	.transcript {
		max-height: 16rem;
		overflow-y: auto;
		border-top: 1px solid var(--auri-outline-variant);
	}
	.transcript ol {
		list-style: none;
		margin: 0;
		padding: 0.5rem;
	}

	.line {
		all: unset;
		display: grid;
		grid-template-columns: auto auto 1fr;
		align-items: baseline;
		column-gap: 0.6rem;
		width: 100%;
		box-sizing: border-box;
		padding: 0.35rem 0.6rem;
		border-radius: var(--auri-shape-sm);
		cursor: pointer;
		font-size: 0.875rem;
		line-height: 1.5;
	}
	.line:hover {
		background: var(--auri-state-hover);
	}
	.line:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: -2px;
	}
	.line[aria-current='true'] {
		background: var(--auri-primary-container);
	}
	.line[aria-current='true'] .text {
		color: var(--auri-on-primary-container);
	}

	.time {
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}
	.speaker {
		font-size: var(--auri-type-caption-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}
	.text {
		color: var(--auri-on-surface);
	}

	.processing {
		margin: 0;
		padding: 1.2rem 1.1rem;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
	}
</style>
