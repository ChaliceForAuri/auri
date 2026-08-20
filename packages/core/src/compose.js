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

/* ------------------------------------------------------------------ mixing */

/** Extract one `### Name — …` section (until the next heading). */
function componentSection(prompt, name) {
	const start = prompt.indexOf(`### ${name} —`);
	if (start === -1) return '';
	const rest = prompt.slice(start);
	const next = rest.slice(4).search(/\n###? /);
	return (next === -1 ? rest : rest.slice(0, next + 4)).trim();
}

/** Extract one `## Heading` block (until the next `## `). */
function topSection(prompt, heading) {
	const start = prompt.indexOf(`${heading}\n`);
	if (start === -1) return '';
	const rest = prompt.slice(start);
	const next = rest.slice(3).search(/\n## /);
	return (next === -1 ? rest : rest.slice(0, next + 3)).trim();
}

/**
 * Rewrite one catalog's fixture into a mixed-surface example: the surface
 * keeps the PRIMARY catalog id, and every component this fixture's own
 * catalog defines gains an explicit catalogId — exactly the idiom an agent
 * must emit when mixing.
 */
function remapFixture(jsonl, primaryId, secondaryId, secondaryContract) {
	const known = new Set(Object.keys(secondaryContract.components ?? {}));
	return jsonl
		.trim()
		.split('\n')
		.map((line) => {
			const message = JSON.parse(line);
			if (message.createSurface) message.createSurface.catalogId = primaryId;
			const list = message.updateComponents?.components ?? message.createSurface?.components;
			if (Array.isArray(list)) {
				for (const spec of list) {
					if (known.has(spec.component) && spec.catalogId === undefined) {
						spec.catalogId = secondaryId;
					}
				}
			}
			return JSON.stringify(message);
		})
		.join('\n');
}

/**
 * Compose across catalogs. The first source with picks is the PRIMARY: its
 * pack structure carries the composition, and the surface uses its catalog
 * id. Every other source's components ride along the protocol's mixing rule —
 * an explicit per-component catalogId — with their pack sections, their
 * catalog-specific rules, and their fixtures rewritten into mixed examples.
 * One contract is composed per participating source (validation is
 * per-catalog: foreign components are each contract's out-of-scope).
 */
export function composeMixed({ sources, components, title }) {
	const picks = sources
		.map((source) => ({
			source,
			chosen: Object.keys(source.contract.components ?? {}).filter((name) =>
				components.includes(name)
			)
		}))
		.filter((pick) => pick.chosen.length > 0);

	const known = new Set(sources.flatMap((s) => Object.keys(s.contract.components ?? {})));
	const missing = components.filter((name) => !known.has(name));

	const contracts = picks.map(({ source, chosen }) => ({
		key: source.key,
		contract: composeContract({ contract: source.contract, components: chosen, title })
	}));

	if (picks.length === 0) {
		return { primary: null, contracts, prompt: '', chosen: [], missing };
	}

	const [primary, ...rest] = picks;
	const primaryId = primary.source.contract.catalogId;

	// Single-source picks degrade to the plain composition, fixtures included.
	if (rest.length === 0) {
		const prompt = composePrompt({
			prompt: primary.source.prompt,
			components: primary.chosen,
			title,
			fixtures: primary.source.fixtures ?? {}
		});
		return { primary: primary.source.key, contracts, prompt, chosen: primary.chosen, missing };
	}

	const out = [
		composePrompt({ prompt: primary.source.prompt, components: primary.chosen, title }).trimEnd()
	];

	for (const { source, chosen } of rest) {
		const secondaryId = source.contract.catalogId;
		out.push('', `## The ${source.key} catalog — mixed onto this surface`, '');
		out.push(
			`The components below come from a second catalog. Emit each of them with an explicit`,
			`\`"catalogId": "${secondaryId}"\` — the surface's default catalog stays`,
			`\`${primaryId}\`.`,
			''
		);
		const rules = topSection(source.prompt, '## Rules');
		if (rules) out.push(rules.replace('## Rules', `### Rules for ${source.key} components`), '');
		for (const name of chosen) {
			const section = componentSection(source.prompt, name);
			if (section) out.push(section, '');
		}
	}

	out.push('', '## Examples', '');
	for (const name of primary.chosen) {
		const fixture = primary.source.fixtures?.[name];
		if (fixture) out.push(`One ${name} stream:`, '', '```jsonl', fixture.trim(), '```', '');
	}
	for (const { source, chosen } of rest) {
		const secondaryId = source.contract.catalogId;
		for (const name of chosen) {
			const fixture = source.fixtures?.[name];
			if (!fixture) continue;
			out.push(
				`One mixed ${name} stream (note the explicit catalogId):`,
				'',
				'```jsonl',
				remapFixture(fixture, primaryId, secondaryId, source.contract),
				'```',
				''
			);
		}
	}

	const prompt =
		out
			.join('\n')
			.replace(/\n{3,}/g, '\n\n')
			.trimEnd() + '\n';

	return {
		primary: primary.source.key,
		contracts,
		prompt,
		chosen: picks.flatMap((pick) => pick.chosen),
		missing
	};
}
