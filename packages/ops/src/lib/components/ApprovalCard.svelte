<script lang="ts">
	import { Slot, getRenderContext, isEventAction } from 'svelte-a2ui';
	import type { Action, ComponentSpec, SlotContent } from 'svelte-a2ui';
	import type { Scope } from 'svelte-a2ui';
	import { isPlainText, renderMarkdown } from 'svelte-a2ui/catalog/basic';

	interface Props {
		title?: unknown;
		summary?: unknown;
		requireComment?: unknown;
		approveLabel?: unknown;
		rejectLabel?: unknown;
		/** Registered `raw`: wire Actions, dispatched manually so `comment` can ride along. */
		approveAction?: unknown;
		rejectAction?: unknown;
		slots?: Record<string, SlotContent>;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let {
		title,
		summary,
		requireComment,
		approveLabel,
		rejectLabel,
		approveAction,
		rejectAction,
		slots,
		weight,
		ariaLabel,
		a2ui
	}: Props = $props();

	const rc = getRenderContext();

	let comment = $state('');
	let decided = $state<'approved' | 'rejected' | null>(null);

	const needsComment = $derived(requireComment === true);
	const canDecide = $derived(!decided && (!needsComment || comment.trim().length > 0));
	const body = $derived(summary === undefined || summary === null ? '' : String(summary));
	const hasDetails = $derived(
		slots?.details?.kind === 'nodes' && slots.details.nodes.length > 0 ? slots.details : null
	);
	const commentId = $derived(`${a2ui.id}-comment`);

	function decide(outcome: 'approved' | 'rejected') {
		if (!canDecide) return;
		const raw = outcome === 'approved' ? approveAction : rejectAction;
		if (!raw || typeof raw !== 'object') return;
		let action = raw as Action;
		// The documented contract: `comment` joins the fired action's context.
		if (needsComment && isEventAction(action)) {
			action = {
				event: {
					...action.event,
					context: { ...(action.event.context ?? {}), comment: comment.trim() }
				}
			};
		}
		rc.client.dispatch(rc.surfaceId, action, a2ui.id, a2ui.scope);
		decided = outcome;
	}
</script>

<section
	class="auri-approval auri-enter"
	data-decided={decided}
	style:flex-grow={weight}
	aria-label={ariaLabel ?? String(title ?? '')}
>
	<p class="title">{title}</p>
	{#if isPlainText(body)}
		<p class="summary">{body}</p>
	{:else}
		<div class="summary">{@html renderMarkdown(body)}</div>
	{/if}

	{#if hasDetails}
		<details>
			<summary>details</summary>
			<Slot content={hasDetails} />
		</details>
	{/if}

	{#if needsComment && !decided}
		<label class="comment">
			<span>comment</span>
			<textarea id={commentId} rows="2" bind:value={comment} disabled={decided !== null}></textarea>
		</label>
	{/if}

	{#if decided}
		<p class="outcome" role="status">{decided}{comment.trim() ? ` — “${comment.trim()}”` : ''}</p>
	{:else}
		<div class="buttons">
			<button type="button" class="approve" disabled={!canDecide} onclick={() => decide('approved')}
				>{approveLabel ?? 'Approve'}</button
			>
			<button type="button" class="reject" disabled={!canDecide} onclick={() => decide('rejected')}
				>{rejectLabel ?? 'Reject'}</button
			>
		</div>
	{/if}
</section>

<style>
	.auri-approval {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		padding: var(--a2ui-space-inset);
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius);
		background: var(--a2ui-color-surface-raised);
		box-shadow: var(--a2ui-elevation);
	}

	[data-decided] {
		opacity: 0.75;
	}

	.title {
		margin: 0;
		font-size: 1.0625rem;
		font-weight: 600;
		color: var(--a2ui-color-text);
	}

	.summary {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--a2ui-color-text);
		overflow-wrap: anywhere;
	}
	.summary :global(p) {
		margin: 0;
	}

	details {
		font-size: 0.875rem;
	}
	summary {
		cursor: pointer;
		color: var(--a2ui-color-text-muted);
		font-size: var(--auri-type-label-size);
	}

	.comment {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}
	.comment span {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--a2ui-color-text-muted);
	}
	textarea {
		font: inherit;
		color: var(--a2ui-color-text);
		background: var(--a2ui-color-surface);
		border: 1px solid var(--a2ui-color-border);
		border-radius: var(--a2ui-radius-small);
		padding: 0.4rem 0.6rem;
		resize: vertical;
	}
	textarea:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
		outline-offset: 1px;
	}

	.buttons {
		display: flex;
		gap: 0.5rem;
	}

	button {
		font: inherit;
		font-weight: 500;
		min-height: var(--a2ui-control-height);
		padding: 0 1rem;
		border-radius: var(--a2ui-radius-small);
		border: 1px solid transparent;
		cursor: pointer;
		transition: filter var(--auri-motion-fast) linear;
	}
	button:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}
	button:focus-visible {
		outline: 2px solid var(--a2ui-color-primary);
		outline-offset: 2px;
	}
	button:not(:disabled):hover {
		filter: brightness(1.06);
	}

	.approve {
		background: var(--a2ui-color-primary);
		color: var(--a2ui-color-on-primary);
	}
	.reject {
		background: transparent;
		color: var(--a2ui-color-text);
		border-color: var(--a2ui-color-border);
	}

	.outcome {
		margin: 0;
		font-size: 0.875rem;
		color: var(--a2ui-color-text-muted);
	}
</style>
