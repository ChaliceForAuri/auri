/**
 * The component pages' data: everything comes from the synced contract
 * artifacts — the fixture IS the demo stream, the schema excerpt IS the
 * contract, the prompt snippet IS the pack section. Nothing here is written
 * for the docs; the docs render what ships. Two catalogs, one shape.
 */

import type { AgentToRenderer } from 'svelte-a2ui';
import opsContract from '$lib/generated/ops/catalog.json';
import formsContract from '$lib/generated/forms/catalog.json';
import insightContract from '$lib/generated/insight/catalog.json';
import opsPack from '$lib/generated/ops/prompt.md?raw';
import formsPack from '$lib/generated/forms/prompt.md?raw';
import insightPack from '$lib/generated/insight/prompt.md?raw';

const fixtureFiles = import.meta.glob('$lib/generated/*/examples/*.jsonl', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** Component name -> fixture basename, where kebab-casing isn't mechanical. */
const FIXTURE_NAMES: Record<string, string> = {
	DataTable: 'datatable',
	KeyValue: 'keyvalue',
	CodeBlock: 'codeblock'
};

/** Stat -> stat, ApprovalCard -> approval-card, TextField -> text-field. */
function kebab(name: string): string {
	return FIXTURE_NAMES[name] ?? name.replace(/(?<=[a-z])(?=[A-Z])/g, '-').toLowerCase();
}

export interface CatalogInfo {
	key: 'ops' | 'forms' | 'insight';
	title: string;
	blurb: string;
	contract: Record<string, unknown>;
	pack: string;
	components: string[];
}

interface ContractDoc {
	components: Record<string, { description?: string }>;
	[key: string]: unknown;
}

export const CATALOGS: CatalogInfo[] = [
	{
		key: 'ops',
		title: 'ops',
		blurb: 'dashboards, data display, and human-in-the-loop decisions',
		contract: opsContract as ContractDoc,
		pack: opsPack,
		components: Object.keys((opsContract as ContractDoc).components)
	},
	{
		key: 'forms',
		title: 'forms',
		blurb: 'agent-composed forms that collect answers from humans',
		contract: formsContract as ContractDoc,
		pack: formsPack,
		components: Object.keys((formsContract as ContractDoc).components)
	},
	{
		key: 'insight',
		title: 'insight',
		blurb: 'present a finding and reach its evidence — insight cards, drill paths, source audit',
		contract: insightContract as ContractDoc,
		pack: insightPack,
		components: Object.keys((insightContract as ContractDoc).components)
	}
];

/** Every component name, both catalogs — names don't collide by design. */
export const COMPONENT_NAMES = CATALOGS.flatMap((c) => c.components);

export interface ComponentDoc {
	name: string;
	catalog: 'ops' | 'forms' | 'insight';
	description: string;
	tagline: string;
	fixtureText: string;
	messages: AgentToRenderer[];
	surfaceId: string;
	contractExcerpt: string;
	promptSnippet: string;
}

function catalogOf(name: string): CatalogInfo {
	const info = CATALOGS.find((c) => c.components.includes(name));
	if (!info) throw new Error(`unknown component ${name}`);
	return info;
}

function fixtureFor(info: CatalogInfo, name: string): string {
	const path = Object.keys(fixtureFiles).find((p) =>
		p.endsWith(`/${info.key}/examples/${kebab(name)}.jsonl`)
	);
	if (!path) throw new Error(`no fixture for ${info.key}/${name}`);
	return fixtureFiles[path]!.trim();
}

/** The pack section for one component: from its `### Name —` to the next heading. */
function promptSectionFor(pack: string, name: string): string {
	const start = pack.indexOf(`### ${name} —`);
	if (start === -1) return '';
	const rest = pack.slice(start);
	const next = rest.slice(4).search(/\n###? /);
	return (next === -1 ? rest : rest.slice(0, next + 4)).trim();
}

export function componentDoc(name: string): ComponentDoc {
	const info = catalogOf(name);
	const spec = (info.contract as ContractDoc).components[name]!;

	const fixtureText = fixtureFor(info, name);
	const messages = fixtureText.split('\n').map((line) => JSON.parse(line) as AgentToRenderer);
	const surfaceId = messages.find((m) => m.createSurface)?.createSurface?.surfaceId ?? 'demo';

	const description = spec.description ?? '';
	const promptSnippet = promptSectionFor(info.pack, name);
	// The pack heading's em-dash tail is the human tagline, e.g. "a KPI tile".
	const tagline = promptSnippet.match(/^### .+? — (.+)$/m)?.[1] ?? '';

	return {
		name,
		catalog: info.key,
		description,
		tagline,
		fixtureText,
		messages,
		surfaceId,
		contractExcerpt: JSON.stringify(spec, null, 2),
		promptSnippet
	};
}
