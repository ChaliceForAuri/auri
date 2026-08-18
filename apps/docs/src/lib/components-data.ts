/**
 * The component pages' data: everything comes from the synced contract
 * artifacts — the fixture IS the demo stream, the schema excerpt IS the
 * contract, the prompt snippet IS the pack section. Nothing here is written
 * for the docs; the docs render what ships.
 */

import type { AgentToRenderer } from 'svelte-a2ui';
import catalog from '$lib/generated/catalog.json';
import promptPack from '$lib/generated/prompt.md?raw';

const fixtures = import.meta.glob('$lib/generated/examples/*.jsonl', {
	query: '?raw',
	import: 'default',
	eager: true
}) as Record<string, string>;

/** Component name -> fixture basename, where lowercasing isn't enough. */
const FIXTURE_NAMES: Record<string, string> = {
	DataTable: 'datatable',
	ApprovalCard: 'approval-card',
	KeyValue: 'keyvalue',
	CodeBlock: 'codeblock',
	ConfirmButton: 'confirm-button'
};

export interface ComponentDoc {
	name: string;
	description: string;
	tagline: string;
	fixtureText: string;
	messages: AgentToRenderer[];
	surfaceId: string;
	contractExcerpt: string;
	promptSnippet: string;
}

const components = catalog.components as Record<string, { description?: string }>;

export const COMPONENT_NAMES = Object.keys(components);

function fixtureFor(name: string): string {
	const base = FIXTURE_NAMES[name] ?? name.toLowerCase();
	const path = Object.keys(fixtures).find((p) => p.endsWith(`/${base}.jsonl`));
	if (!path) throw new Error(`no fixture for ${name}`);
	return fixtures[path]!.trim();
}

/** The pack section for one component: from its `### Name —` to the next heading. */
function promptSectionFor(name: string): string {
	const start = promptPack.indexOf(`### ${name} —`);
	if (start === -1) return '';
	const rest = promptPack.slice(start);
	const next = rest.slice(4).search(/\n###? /);
	return (next === -1 ? rest : rest.slice(0, next + 4)).trim();
}

export function componentDoc(name: string): ComponentDoc {
	const spec = components[name];
	if (!spec) throw new Error(`unknown component ${name}`);

	const fixtureText = fixtureFor(name);
	const messages = fixtureText.split('\n').map((line) => JSON.parse(line) as AgentToRenderer);
	const surfaceId = messages.find((m) => m.createSurface)?.createSurface?.surfaceId ?? 'demo';

	const description = spec.description ?? '';
	const promptSnippet = promptSectionFor(name);
	// The pack heading's em-dash tail is the human tagline, e.g. "a KPI tile".
	const tagline = promptSnippet.match(/^### .+? — (.+)$/m)?.[1] ?? '';

	return {
		name,
		description,
		tagline,
		fixtureText,
		messages,
		surfaceId,
		contractExcerpt: JSON.stringify(spec, null, 2),
		promptSnippet
	};
}
