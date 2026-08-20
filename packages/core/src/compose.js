/**
 * Catalog composition (PLAN 2.5, M5): pick components from a catalog and mint
 * a smaller vocabulary — a subset contract, a subset prompt-pack, and subset
 * fixtures that still teach everything the chosen components need and nothing
 * they don't. A composition is a vocabulary, not a new wire catalog: emitted
 * components keep their source `catalogId`, so any renderer registered for the
 * source catalog renders a composition unchanged.
 *
 * Pure functions, zero dependencies — runs in node and the browser (the docs
 * /composer page calls this live on every checkbox click).
 */

const DEFS_PREFIX = '#/$defs/';

/** Walk a schema node collecting local $defs references, transitively. */
function collectRefs(node, defs, keep) {
	if (Array.isArray(node)) {
		for (const item of node) collectRefs(item, defs, keep);
		return;
	}
	if (!node || typeof node !== 'object') return;
	for (const [key, value] of Object.entries(node)) {
		if (key === '$ref' && typeof value === 'string' && value.startsWith(DEFS_PREFIX)) {
			const name = value.slice(DEFS_PREFIX.length);
			if (!keep.has(name) && defs[name]) {
				keep.add(name);
				collectRefs(defs[name], defs, keep);
			}
		} else {
			collectRefs(value, defs, keep);
		}
	}
}

export function composeContract({ contract, components, title, id }) {
	const subset = {};
	for (const name of components) {
		if (contract.components?.[name]) subset[name] = contract.components[name];
	}

	const keep = new Set();
	collectRefs(subset, contract.$defs ?? {}, keep);
	const defs = {};
	for (const name of Object.keys(contract.$defs ?? {})) {
		if (keep.has(name)) defs[name] = contract.$defs[name];
	}

	return {
		...contract,
		// The minted id names the composition document. catalogId stays the
		// source's: that is what emitted components carry on the wire, and what
		// renderers resolve against — a composition never changes the wire.
		...(id ? { $id: id } : {}),
		...(title ? { title } : {}),
		description: `Composed from ${contract.title}: ${Object.keys(subset).join(', ')}. Source contract: ${contract.catalogId}`,
		components: subset,
		$defs: defs
	};
}

/**
 * Prompt-packs are structured for exactly this cut: global `##` sections
 * (wire format, rules, catalog mixing) apply to any subset and are kept;
 * `### Name — blurb` sections under `## Components` are kept only for chosen
 * components; the full pack's closing example is replaced by the chosen
 * components' own fixtures.
 */
export function composePrompt({ prompt, components, title, fixtures = {} }) {
	const lines = prompt.split('\n');
	const out = [];
	let keeping = true;
	let inComponents = false;

	for (const line of lines) {
		if (line.startsWith('## ')) {
			inComponents = line.startsWith('## Components');
			keeping = !line.startsWith('## A complete example');
		} else if (inComponents && line.startsWith('### ')) {
			const name = line.slice(4).split(' — ')[0].trim();
			keeping = components.includes(name);
		}
		if (keeping) out.push(line);
	}

	if (title && out[0]?.startsWith('# ')) {
		out[0] = `# ${title} — prompt-pack (composed from auri ops)`;
	}
	if (out[0]?.startsWith('# ')) {
		out.splice(1, 0, '', `> Composed vocabulary: ${components.join(', ')}.`);
	}

	const examples = components.filter((name) => fixtures[name]);
	if (examples.length > 0) {
		while (out.length > 0 && out[out.length - 1].trim() === '') out.pop();
		out.push('', '## Examples', '');
		for (const name of examples) {
			out.push(`One ${name} stream:`, '', '```jsonl', fixtures[name].trim(), '```', '');
		}
	}

	return (
		out
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n'
	);
}

export function composeCatalog({ contract, prompt, fixtures = {}, components, title, id }) {
	const available = Object.keys(contract.components ?? {});
	const chosen = available.filter((name) => components.includes(name));
	const missing = components.filter((name) => !available.includes(name));

	const pickedFixtures = {};
	for (const name of chosen) {
		if (fixtures[name]) pickedFixtures[name] = fixtures[name];
	}

	return {
		contract: composeContract({ contract, components: chosen, title, id }),
		prompt: composePrompt({ prompt, components: chosen, title, fixtures }),
		fixtures: pickedFixtures,
		chosen,
		missing
	};
}
