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

export {
	formatStatValue,
	formatDelta,
	formatCellNumber,
	formatCellDateTime,
	normalizeIntent
} from './format.js';
export type { FormattedValue, Intent } from './format.js';
