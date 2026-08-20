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
import Chart from './components/Chart.svelte';
import Timeline from './components/Timeline.svelte';
import Sparkline from './components/Sparkline.svelte';
import Progress from './components/Progress.svelte';
import KeyValue from './components/KeyValue.svelte';
import CodeBlock from './components/CodeBlock.svelte';
import ConfirmButton from './components/ConfirmButton.svelte';

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
	}),
	Chart: entry(Chart, { raw: ['pointAction'] }),
	Timeline: entry(Timeline),
	Sparkline: entry(Sparkline),
	Progress: entry(Progress),
	KeyValue: entry(KeyValue),
	CodeBlock: entry(CodeBlock),
	// No extra context to merge, so the standard pre-built handler suffices.
	ConfirmButton: entry(ConfirmButton, { actions: ['action'] })
};

export const opsCatalog: Catalog = {
	id: OPS_CATALOG_ID,
	components: OPS_COMPONENTS
};
