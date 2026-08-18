/**
 * The svelte-a2ui registration for the ops catalog.
 *
 * `raw` marks the action-bearing props that components dispatch themselves so
 * they can merge in the contract-documented extra context (`row`/`rowIndex` on
 * DataTable, `comment` on ApprovalCard) — the pre-built `actions` handlers
 * can't carry extras.
 */

import type { Catalog, CatalogEntry } from 'svelte-a2ui';

import Stat from './components/Stat.svelte';
import Badge from './components/Badge.svelte';
import Callout from './components/Callout.svelte';
import DataTable from './components/DataTable.svelte';
import ApprovalCard from './components/ApprovalCard.svelte';

/** Versioned, served for real by the docs site; breaking changes are a new id. */
export const OPS_CATALOG_ID = 'https://chaliceforauri.github.io/auri/catalogs/ops/v1.json';

const entry = (component: unknown, rest: Omit<CatalogEntry, 'component'> = {}): CatalogEntry =>
	({ component, ...rest }) as CatalogEntry;

export const OPS_COMPONENTS: Record<string, CatalogEntry> = {
	Stat: entry(Stat),
	Badge: entry(Badge),
	Callout: entry(Callout),
	DataTable: entry(DataTable, { raw: ['rowAction'] }),
	ApprovalCard: entry(ApprovalCard, {
		slots: { details: 'child' },
		raw: ['approveAction', 'rejectAction']
	})
};

export const opsCatalog: Catalog = {
	id: OPS_CATALOG_ID,
	components: OPS_COMPONENTS
};
