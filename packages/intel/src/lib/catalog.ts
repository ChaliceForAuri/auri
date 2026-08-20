import type { Catalog, CatalogEntry } from 'svelte-a2ui';

import InsightCard from './components/InsightCard.svelte';
import SourceAudit from './components/SourceAudit.svelte';
import VelocityScatter from './components/VelocityScatter.svelte';
import ClusterMap from './components/ClusterMap.svelte';
import DrillStack from './components/DrillStack.svelte';

export const INTEL_CATALOG_ID = 'https://chaliceforauri.github.io/auri/catalogs/intel/v1.json';

const entry = (component: unknown, rest: Omit<CatalogEntry, 'component'> = {}): CatalogEntry =>
	({ component, ...rest }) as CatalogEntry;

/**
 * The #20 foundation in registration form: every action that carries a
 * subject is declared `raw`, so the component merges subjectKind/subjectId
 * (and verdict / startSeconds / reason) before dispatch — see subject.ts.
 */
export const INTEL_COMPONENTS: Record<string, CatalogEntry> = {
	InsightCard: entry(InsightCard, {
		raw: ['drillAction', 'feedbackAction'],
		slots: { detailComponentId: 'child' }
	}),
	SourceAudit: entry(SourceAudit, { raw: ['seekAction'] }),
	VelocityScatter: entry(VelocityScatter, { raw: ['pointAction'] }),
	ClusterMap: entry(ClusterMap, { raw: ['clusterAction'] }),
	DrillStack: entry(DrillStack, { bindings: ['activeIndex'], actions: ['dismissAction'] })
};

export const intelCatalog: Catalog = {
	id: INTEL_CATALOG_ID,
	components: INTEL_COMPONENTS
};
