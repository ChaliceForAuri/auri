<script lang="ts">
	import { getRenderContext, isEventAction } from 'svelte-a2ui';
	import type { Action, ComponentSpec } from 'svelte-a2ui';
	import type { Scope } from 'svelte-a2ui';
	import { formatCellNumber, formatCellDateTime } from '../format.js';

	interface Column {
		key: string;
		label?: unknown;
		align?: string;
		format?: string;
		sortable?: boolean;
	}

	interface FooterCell {
		key: string;
		aggregate: 'sum' | 'mean' | 'count';
		label?: string;
	}

	interface Props {
		columns?: unknown;
		rows?: unknown;
		label?: unknown;
		emptyText?: unknown;
		/** Registered `raw`: arrives as the wire Action so row context can be merged in. */
		rowAction?: unknown;
		footer?: unknown;
		weight?: number;
		ariaLabel?: string;
		a2ui: { id: string; component: string; spec: ComponentSpec; scope: Scope };
	}

	let { columns, rows, label, emptyText, rowAction, footer, weight, ariaLabel, a2ui }: Props =
		$props();

	const rc = getRenderContext();

	const cols: Column[] = $derived(
		Array.isArray(columns)
			? columns.filter(
					(c): c is Column => Boolean(c) && typeof c === 'object' && typeof c.key === 'string'
				)
			: []
	);
	// undefined -> binding hasn't resolved (skeleton); [] -> designed empty state.
	const rowList = $derived(Array.isArray(rows) ? (rows as Record<string, unknown>[]) : undefined);

	let sortKey = $state<string | null>(null);
	let sortDir = $state<1 | -1>(1);

	function toggleSort(col: Column) {
		if (!col.sortable) return;
		if (sortKey === col.key) sortDir = sortDir === 1 ? -1 : 1;
		else {
			sortKey = col.key;
			sortDir = 1;
		}
	}

	const sorted = $derived.by(() => {
		if (!rowList || !sortKey) return rowList;
		const key = sortKey;
		return [...rowList].sort((a, b) => {
			const av = a?.[key];
			const bv = b?.[key];
			if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * sortDir;
			return String(av ?? '').localeCompare(String(bv ?? '')) * sortDir;
		});
	});

	const interactive = $derived(Boolean(rowAction) && typeof rowAction === 'object');

	function activate(row: Record<string, unknown>, rowIndex: number) {
		if (!interactive) return;
		const action = rowAction as Action;
		// The documented contract: the renderer adds `row` + `rowIndex` to the context.
		const merged: Action = isEventAction(action)
			? { event: { ...action.event, context: { ...(action.event.context ?? {}), row, rowIndex } } }
			: action;
		rc.client.dispatch(rc.surfaceId, merged, a2ui.id, a2ui.scope);
	}

	function cell(row: Record<string, unknown>, col: Column): string {
		const value = row?.[col.key];
		if (value === undefined || value === null || value === '') return '—';
		if (col.format === 'number' && typeof value === 'number') return formatCellNumber(value);
		if (col.format === 'datetime') return formatCellDateTime(String(value));
		return String(value);
	}

	/* Footer aggregates (issue #19): computed client-side from the resolved
	   rows — the wire never carries a total that could disagree with them —
	   and recomputed on every data update, so filtered rows re-total. */
	const footCells: FooterCell[] = $derived(
		Array.isArray(footer)
			? footer.filter(
					(f): f is FooterCell =>
						Boolean(f) &&
						typeof f === 'object' &&
						typeof f.key === 'string' &&
						(f.aggregate === 'sum' || f.aggregate === 'mean' || f.aggregate === 'count')
				)
			: []
	);

	function aggregateValue(foot: FooterCell): string {
		if (!rowList) return '';
		const values = rowList
			.map((row) => row?.[foot.key])
			.filter((v) => v !== undefined && v !== null && v !== '');
		if (foot.aggregate === 'count') return formatCellNumber(values.length);
		const nums = values.map(Number).filter((n) => !Number.isNaN(n));
		if (nums.length === 0) return '—';
		const sum = nums.reduce((a, b) => a + b, 0);
		return formatCellNumber(foot.aggregate === 'sum' ? sum : sum / nums.length);
	}
</script>

<div
	class="auri-table auri-enter"
	style:flex-grow={weight}
	role="group"
	aria-label={ariaLabel ?? (label ? String(label) : undefined)}
>
	<table>
		{#if label}<caption>{label}</caption>{/if}
		<thead>
			<tr>
				{#each cols as col (col.key)}
					<th
						data-align={col.align === 'center' || col.align === 'end' ? col.align : 'start'}
						aria-sort={sortKey === col.key
							? sortDir === 1
								? 'ascending'
								: 'descending'
							: undefined}
					>
						{#if col.sortable}
							<button type="button" class="sort" onclick={() => toggleSort(col)}>
								{col.label}<span class="sort-glyph" aria-hidden="true"
									>{sortKey === col.key ? (sortDir === 1 ? '↑' : '↓') : '↕'}</span
								>
							</button>
						{:else}
							{col.label}
						{/if}
					</th>
				{/each}
			</tr>
		</thead>
		<tbody>
			{#if !sorted}
				<!-- Rows binding hasn't resolved yet: component-shaped shimmer, no CLS on arrival. -->
				{#each [0, 1, 2] as i (i)}
					<tr class="skeleton-row" aria-hidden="true">
						{#each cols as col (col.key)}
							<td><span class="auri-skeleton cell-skeleton"></span></td>
						{/each}
					</tr>
				{/each}
			{:else if sorted.length === 0}
				<tr>
					<td class="empty" colspan={cols.length}>{emptyText ?? 'nothing here yet'}</td>
				</tr>
			{:else}
				{#each sorted as row, i (i)}
					<tr
						class:interactive
						tabindex={interactive ? 0 : undefined}
						onclick={() => activate(row, i)}
						onkeydown={(e) => {
							if (interactive && (e.key === 'Enter' || e.key === ' ')) {
								e.preventDefault();
								activate(row, i);
							}
						}}
					>
						{#each cols as col (col.key)}
							<td
								data-align={col.align === 'center' || col.align === 'end' ? col.align : 'start'}
								data-format={col.format === 'number' ? 'number' : undefined}>{cell(row, col)}</td
							>
						{/each}
					</tr>
				{/each}
			{/if}
		</tbody>
		{#if footCells.length > 0 && cols.length > 0}
			<tfoot>
				<tr>
					{#each cols as col (col.key)}
						{@const foot = footCells.find((f) => f.key === col.key)}
						<td
							data-align={col.align === 'center' || col.align === 'end' ? col.align : 'start'}
							data-format="number"
						>
							{#if foot}
								{#if !rowList}
									<!-- Rows still loading: a ledger reading 0 would be a lie. -->
									<span class="auri-skeleton cell-skeleton" aria-hidden="true"></span>
								{:else}
									{#if foot.label}<span class="foot-label">{foot.label}</span>{/if}
									<span class="foot-value">{aggregateValue(foot)}</span>
								{/if}
							{/if}
						</td>
					{/each}
				</tr>
			</tfoot>
		{/if}
	</table>
</div>

<style>
	/* Foundation: card + hairline; rows separated by the same line. */
	.auri-table {
		min-width: 0;
		margin: var(--a2ui-space-leaf);
		border: 1px solid var(--auri-outline-variant);
		border-radius: var(--auri-shape-lg);
		background: var(--auri-surface-container);
		overflow-x: auto;
	}

	table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		color: var(--auri-on-surface);
	}

	caption {
		padding: 0.85rem 1.1rem 0.15rem;
		text-align: start;
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}

	th,
	td {
		padding: 0.55rem 1.1rem;
		text-align: start;
	}
	[data-align='end'] {
		text-align: end;
	}
	[data-align='center'] {
		text-align: center;
	}
	td[data-format='number'] {
		font-variant-numeric: tabular-nums;
	}

	thead th {
		font-size: var(--auri-type-label-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
		border-bottom: 1px solid var(--auri-outline-variant);
		white-space: nowrap;
	}

	.sort {
		all: unset;
		cursor: pointer;
		display: inline-flex;
		align-items: center;
		gap: 0.3em;
	}
	.sort:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: 2px;
		border-radius: var(--auri-shape-sm);
	}
	.sort-glyph {
		opacity: 0.5;
		font-size: 0.85em;
	}

	tbody tr:not(:last-child) td {
		border-bottom: 1px solid var(--auri-outline-variant);
	}

	tr.interactive {
		cursor: pointer;
	}
	tr.interactive:hover td {
		background: var(--auri-state-hover);
	}
	tr.interactive:focus-visible {
		outline: 2px solid var(--auri-primary);
		outline-offset: -2px;
	}

	.cell-skeleton {
		width: 100%;
		max-width: 8ch;
		height: 1em;
	}

	tfoot td {
		border-top: 1px solid var(--auri-outline-variant);
		font-variant-numeric: tabular-nums;
	}
	.foot-label {
		display: block;
		font-size: var(--auri-type-caption-size);
		font-weight: var(--auri-type-label-weight);
		color: var(--auri-on-surface-variant);
	}
	.foot-value {
		font-weight: 600;
	}

	.empty {
		padding: 1.4rem 1.1rem;
		text-align: center;
		color: var(--auri-on-surface-variant);
	}
</style>
