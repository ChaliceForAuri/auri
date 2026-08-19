<script lang="ts">
	import { isPlainText, renderMarkdown } from 'svelte-a2ui/catalog/basic';
	import { normalizeIntent, formatTimelineTime, formatCellDateTime } from '../format.js';

	interface Item {
		title?: unknown;
		time?: unknown;
		text?: unknown;
		intent?: unknown;
	}

	interface Props {
		label?: unknown;
		items?: unknown;
		emptyText?: unknown;
		weight?: number;
		ariaLabel?: string;
	}

	let { label, items, emptyText, weight, ariaLabel }: Props = $props();

	// undefined -> binding unresolved (skeleton); [] -> designed empty state.
	const events = $derived(
		Array.isArray(items)
			? (items as Item[]).filter((item) => Boolean(item) && typeof item === 'object')
			: undefined
	);
</script>

<div
	class="auri-timeline auri-enter"
	style:flex-grow={weight}
	role="group"
	aria-label={ariaLabel ?? (label ? String(label) : undefined)}
>
	{#if label}<p class="label">{label}</p>{/if}

	{#if !events}
		<ol aria-hidden="true">
			{#each [0, 1, 2] as i (i)}
				<li data-intent="neutral">
					<span class="auri-skeleton line-skeleton"></span>
				</li>
			{/each}
		</ol>
	{:else if events.length === 0}
		<p class="empty">{emptyText ?? 'nothing yet'}</p>
	{:else}
		<ol>
			{#each events as event, i (i)}
				{@const tone = normalizeIntent(event.intent)}
				{@const body = event.text === undefined || event.text === null ? '' : String(event.text)}
				<li data-intent={tone}>
					<div class="head">
						<span class="title">{event.title}</span>
						{#if typeof event.time === 'string'}
							<time datetime={event.time} title={formatCellDateTime(event.time)}
								>{formatTimelineTime(event.time)}</time
							>
						{/if}
					</div>
					{#if body}
						{#if isPlainText(body)}
							<p class="text">{body}</p>
						{:else}
							<div class="text">{@html renderMarkdown(body)}</div>
						{/if}
					{/if}
				</li>
			{/each}
		</ol>
	{/if}
</div>

<style>
	.auri-timeline {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
	}

	.label {
		margin: 0 0 0.5rem;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}

	ol {
		list-style: none;
		margin: 0;
		padding: 0;
	}

	li {
		position: relative;
		padding-inline-start: 1.25rem;
		padding-bottom: 0.9rem;
	}
	/* The connecting spine … */
	li::before {
		content: '';
		position: absolute;
		inset-inline-start: 0.3rem;
		top: 0.9rem;
		bottom: -0.1rem;
		width: 1px;
		background: var(--auri-outline-variant);
	}
	li:last-child::before {
		display: none;
	}
	li:last-child {
		padding-bottom: 0;
	}
	/* … and the intent dot. */
	li::after {
		content: '';
		position: absolute;
		inset-inline-start: 0;
		top: 0.3rem;
		width: 0.55rem;
		height: 0.55rem;
		border-radius: 50%;
		background: var(--auri-intent-neutral);
	}
	li[data-intent='good']::after {
		background: var(--auri-intent-good);
	}
	li[data-intent='bad']::after {
		background: var(--auri-intent-bad);
	}
	li[data-intent='warning']::after {
		background: var(--auri-intent-warning);
	}
	li[data-intent='info']::after {
		background: var(--auri-intent-info);
	}

	.head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 0.75rem;
	}

	.title {
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--auri-on-surface);
		overflow-wrap: anywhere;
	}

	time {
		flex: none;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		font-variant-numeric: tabular-nums;
	}

	.text {
		margin: 0.15rem 0 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--auri-on-surface-variant);
		overflow-wrap: anywhere;
	}
	.text :global(p) {
		margin: 0;
	}

	.line-skeleton {
		width: 60%;
		height: 0.875rem;
	}

	.empty {
		margin: 0;
		font-size: 0.875rem;
		color: var(--auri-on-surface-variant);
	}
</style>
