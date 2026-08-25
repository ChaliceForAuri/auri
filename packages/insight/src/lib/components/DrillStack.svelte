<script lang="ts">
	import { untrack } from 'svelte';
	import { Node } from 'svelte-a2ui';
	import type { Binding } from 'svelte-a2ui';

	interface Level {
		title: string;
		componentId: string;
	}

	interface Props {
		levels?: unknown;
		bindings: Record<string, Binding>;
		/** Pre-built handler for whole-stack dismissal. */
		actions?: Record<string, () => void>;
		weight?: number;
		ariaLabel?: string;
	}

	let { levels, bindings, actions, weight, ariaLabel }: Props = $props();

	const list: Level[] = $derived(
		Array.isArray(levels)
			? levels.filter(
					(l): l is Level =>
						Boolean(l) &&
						typeof l === 'object' &&
						typeof l.title === 'string' &&
						typeof l.componentId === 'string'
				)
			: []
	);

	const binding = $derived(bindings.activeIndex);
	const depth = $derived.by(() => {
		const raw = binding?.value;
		const n = typeof raw === 'number' ? Math.round(raw) : 0;
		return Math.max(0, Math.min(n, Math.max(0, list.length - 1)));
	});

	function goTo(index: number) {
		binding?.set(Math.max(0, Math.min(index, list.length - 1)));
	}

	/* Focus contract (issue #23): focus moves to the pushed level, and returns
	   EXACTLY where it left on pop — the most commonly broken drill behaviour,
	   so it is a browser test, not a hope. Exact restoration is only possible
	   if the remembered element survives, which is why every level stays
	   mounted (hidden, not destroyed) while deeper levels are open. */
	let stages = $state<HTMLElement[]>([]);
	let previousDepth = 0;
	const focusReturns: (Element | null)[] = [];

	$effect(() => {
		const current = depth;
		untrack(() => {
			if (current > previousDepth) {
				focusReturns[previousDepth] = document.activeElement;
				stages[current]?.focus();
			} else if (current < previousDepth) {
				const back = focusReturns[current];
				if (back instanceof HTMLElement && back.isConnected) back.focus();
				else stages[current]?.focus();
				focusReturns.length = current + 1;
			}
			previousDepth = current;
		});
	});

	function onKey(e: KeyboardEvent) {
		if (e.key === 'Escape' && depth > 0) {
			e.preventDefault();
			goTo(depth - 1);
		}
	}
</script>

<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
<!-- Escape-pops is a container-level convenience over the levels' own
     interactive content; the breadcrumb buttons are the accessible path. -->
<section
	class="auri-drillstack auri-enter"
	style:flex-grow={weight}
	aria-label={ariaLabel ?? 'drill path'}
	onkeydown={onKey}
>
	<nav class="crumbs" aria-label="drill path">
		<ol>
			{#each list as level, i (level.componentId)}
				<li>
					<button
						type="button"
						class="crumb"
						aria-current={i === depth ? 'true' : undefined}
						disabled={i > depth}
						onclick={() => goTo(i)}>{level.title}</button
					>
				</li>
			{/each}
		</ol>
		{#if actions?.dismissAction}
			<button type="button" class="dismiss" onclick={() => actions?.dismissAction?.()}
				>dismiss</button
			>
		{/if}
	</nav>

	{#each list as level, i (level.componentId)}
		<div
			class="stage"
			bind:this={stages[i]}
			hidden={i !== depth}
			tabindex="-1"
			aria-label={level.title}
		>
			<Node id={level.componentId} />
		</div>
	{/each}
</section>

<style>
	.auri-drillstack {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		display: flex;
		flex-direction: column;
		gap: 0.4rem;
	}

	.crumbs {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 0.75rem;
	}
	.crumbs ol {
		list-style: none;
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.2rem;
		margin: 0;
		padding: 0;
	}
	.crumbs li {
		display: inline-flex;
		align-items: center;
	}
	.crumbs li + li::before {
		content: '›';
		color: var(--auri-on-surface-variant);
		margin: 0 0.35rem;
	}

	.crumb {
		font: inherit;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
		background: transparent;
		border: none;
		padding: 0.2rem 0.45rem;
		border-radius: var(--auri-shape-sm);
		cursor: pointer;
	}
	.crumb:hover:not(:disabled) {
		color: var(--auri-on-surface);
		background: var(--auri-surface-container-high);
	}
	.crumb[aria-current='true'] {
		color: var(--auri-on-surface);
		background: var(--auri-surface-container-high);
	}
	.crumb:disabled {
		opacity: 0.45;
		cursor: default;
	}
	.crumb:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
	}

	.dismiss {
		font: inherit;
		font-size: var(--auri-type-caption-size);
		color: var(--auri-on-surface-variant);
		background: transparent;
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-sm);
		padding: 0.15rem 0.6rem;
		cursor: pointer;
	}
	.dismiss:hover {
		color: var(--auri-on-surface);
	}

	.stage {
		outline: none;
	}
	.stage[hidden] {
		display: none;
	}
	.stage:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
		border-radius: var(--auri-shape-md);
	}
</style>
