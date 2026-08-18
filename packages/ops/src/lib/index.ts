/**
 * @aurilabs/ops — the auri ops catalog for A2UI.
 *
 * ```svelte
 * import { opsCatalog } from '@aurilabs/ops';
 * import '@aurilabs/ops/theme.css';
 * const catalog = createCatalogRegistry([basicCatalog, opsCatalog]);
 * ```
 */

export { opsCatalog, OPS_COMPONENTS, OPS_CATALOG_ID } from './catalog.js';

export { default as Stat } from './components/Stat.svelte';
export { default as Badge } from './components/Badge.svelte';
export { default as Callout } from './components/Callout.svelte';
export { default as DataTable } from './components/DataTable.svelte';
export { default as ApprovalCard } from './components/ApprovalCard.svelte';
export { default as Chart } from './components/Chart.svelte';
export { default as Timeline } from './components/Timeline.svelte';
export { default as Sparkline } from './components/Sparkline.svelte';
export { default as Progress } from './components/Progress.svelte';
export { default as KeyValue } from './components/KeyValue.svelte';
export { default as CodeBlock } from './components/CodeBlock.svelte';
export { default as ConfirmButton } from './components/ConfirmButton.svelte';

export {
	formatStatValue,
	formatDelta,
	formatCellNumber,
	formatCellDateTime,
	formatTimelineTime,
	formatKeyValue,
	sparklineSummary,
	normalizeIntent
} from './format.js';
export type { FormattedValue, Intent } from './format.js';
export { normalizeSeries, niceCeil, ticks, sampleIndices } from './chart.js';
export type { SeriesData } from './chart.js';
