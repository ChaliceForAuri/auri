/** A spec-style catalog contract document (catalog.json). */
export interface CatalogContract {
	$id?: string;
	title?: string;
	description?: string;
	catalogId?: string;
	components?: Record<string, unknown>;
	$defs?: Record<string, unknown>;
	[key: string]: unknown;
}

export interface ComposeInput {
	/** The source contract document. */
	contract: CatalogContract;
	/** Component names to keep, in the source contract's order. */
	components: string[];
	/** Title for the composed artifacts (defaults to the source title). */
	title?: string;
	/** Minted `$id` for the composed contract document. `catalogId` always stays the source's. */
	id?: string;
}

export interface ComposePromptInput {
	/** The source prompt-pack markdown. */
	prompt: string;
	components: string[];
	title?: string;
	/** Per-component fixture JSONL, embedded as the composed pack's examples. */
	fixtures?: Record<string, string>;
}

export interface Composition {
	contract: CatalogContract;
	prompt: string;
	fixtures: Record<string, string>;
	/** Requested components that exist in the source, in source order. */
	chosen: string[];
	/** Requested components the source does not have. */
	missing: string[];
}

export function composeContract(input: ComposeInput): CatalogContract;
export function composePrompt(input: ComposePromptInput): string;
export function composeCatalog(
	input: ComposeInput & Omit<ComposePromptInput, 'components'>
): Composition;

export interface ComposeSource {
	/** Short catalog key, e.g. 'ops' — used in headings and the result. */
	key: string;
	contract: CatalogContract;
	prompt: string;
	fixtures?: Record<string, string>;
}

export interface MixedComposition {
	/** Key of the catalog whose id the surface uses; null when nothing was picked. */
	primary: string | null;
	/** One composed contract per source that contributed components. */
	contracts: { key: string; contract: CatalogContract }[];
	prompt: string;
	/** All picked components, grouped by source order. */
	chosen: string[];
	missing: string[];
}

export function composeMixed(input: {
	sources: ComposeSource[];
	components: string[];
	title?: string;
}): MixedComposition;
