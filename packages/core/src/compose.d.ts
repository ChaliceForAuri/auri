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
