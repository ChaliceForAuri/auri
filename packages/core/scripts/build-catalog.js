/**
 * Compiles an authored catalog source into an A2UI v1.0-conformant catalog.json.
 *
 * The v1.0 spec (specification/v1_0/docs/a2ui_protocol.md, "Catalog Schema
 * Rules and Conventions") imposes three constraints that make a catalog
 * painful to hand-author:
 *
 *   Rule 2 — custom `$defs` are PROHIBITED. Only `anyComponent`/`anyFunction`
 *            may live there; every helper must be inlined into each component
 *            that uses it. For auri that means the intent scale is repeated in
 *            a dozen places, which no human maintains without drift.
 *   Rule 5 — components MUST NOT wrap themselves in `ComponentCommon` via
 *            `allOf`; the envelope composes id/catalogId/accessibility.
 *   Rule 7 — only ten root keys are legal.
 *
 * So we author with helpers (readable, one definition of intent) and compile to
 * the flattened, conformant artifact — exactly as tokens.json compiles to
 * tokens.css. The generated catalog.json is what ships and what validates.
 *
 * Rule 3 is the pleasant surprise: protocol primitives may be `$ref`d to the
 * spec's own common_types.json, so auri's Dynamic-value, Action and pathRef definitions
 * stop being copies and become references to the source of truth.
 *
 * usage: node build-catalog.js <source.json> <out.json> [--check]
 */

import { readFileSync, writeFileSync } from 'node:fs';

const COMMON = 'https://a2ui.org/specification/v1_0/common_types.json#/$defs';

/** auri's local defs that ARE protocol primitives — these become external refs. */
const PROTOCOL_TYPES = {
	dynamicString: 'DynamicString',
	dynamicNumber: 'DynamicNumber',
	dynamicBoolean: 'DynamicBoolean',
	dynamicValue: 'DynamicValue',
	dynamicStringList: 'DynamicStringList',
	action: 'Action',
	checkRule: 'CheckRule',
	pathRef: 'DataBinding',
	componentId: 'ComponentId',
	childList: 'ChildList'
};

/** Legal root keys (rule 7). Anything else is stripped with a warning. */
const ROOT_KEYS = new Set([
	'$schema',
	'$id',
	'protocolVersion',
	'title',
	'description',
	'catalogId',
	'instructions',
	'components',
	'functions',
	'$defs'
]);

const [, , sourcePath, outPath] = process.argv;
if (!sourcePath || !outPath) {
	console.error('usage: node build-catalog.js <source.json> <out.json> [--check]');
	process.exit(2);
}

const source = JSON.parse(readFileSync(sourcePath, 'utf8'));
const defs = source.$defs ?? {};
const warnings = [];

/**
 * Rewrite every `$ref` in a subtree: protocol primitives become external refs,
 * auri-specific helpers are INLINED (rule 2). Inlining is recursive because a
 * helper may itself reference another helper.
 */
function resolve(node, seen = new Set()) {
	if (Array.isArray(node)) return node.map((n) => resolve(n, seen));
	if (!node || typeof node !== 'object') return node;

	if (typeof node.$ref === 'string' && node.$ref.startsWith('#/$defs/')) {
		const name = node.$ref.slice('#/$defs/'.length);
		const protocolType = PROTOCOL_TYPES[name];
		if (protocolType) {
			// A description alongside a $ref is meaningful to the LLM reading the
			// catalog, so it survives the rewrite.
			const { $ref, ...rest } = node;
			return { $ref: `${COMMON}/${protocolType}`, ...rest };
		}
		if (!defs[name]) {
			warnings.push(`unknown $def referenced: ${name}`);
			return node;
		}
		if (seen.has(name)) {
			warnings.push(`cyclic $def inlined once: ${name}`);
			return node;
		}
		const { $ref, ...overrides } = node;
		// Inline the helper, letting call-site keys (description, default) win.
		return { ...resolve(defs[name], new Set([...seen, name])), ...overrides };
	}

	const out = {};
	for (const [key, value] of Object.entries(node)) out[key] = resolve(value, seen);
	return out;
}

/**
 * Flatten `allOf: [{$ref: componentCommon}, {…}]` into a plain schema (rule 5).
 * The envelope supplies id/catalogId/accessibility, so the wrapper is not just
 * unnecessary — it is forbidden.
 */
function flattenComponent(name, schema) {
	const branches = schema.allOf;
	let own = schema;
	if (Array.isArray(branches)) {
		own = branches.find((b) => !b.$ref?.endsWith('componentCommon')) ?? {};
		const dropped = branches.filter((b) => b.$ref?.endsWith('componentCommon'));
		if (dropped.length === 0) warnings.push(`${name}: allOf had no componentCommon to drop`);
	}

	const properties = resolve(own.properties ?? {});
	if (properties.component?.const !== name) {
		warnings.push(`${name}: discriminator const missing or mismatched (rule 4)`);
	}

	return {
		type: 'object',
		...(schema.description ? { description: schema.description } : {}),
		properties,
		...(own.required ? { required: own.required } : {})
		/*
		 * Deliberately NO additionalProperties/unevaluatedProperties: the spec's
		 * own basic catalog sets neither. Components declare only their own
		 * properties and the envelope composes id/catalogId/accessibility around
		 * them (rule 5), so a closed component schema would reject `id` on every
		 * real wire message. Verified against specification/v1_0/catalogs/basic.
		 */
	};
}

const components = {};
for (const [name, schema] of Object.entries(source.components ?? {})) {
	components[name] = flattenComponent(name, schema);
}

const out = {};
for (const key of Object.keys(source)) {
	if (key === '$defs' || key === 'components') continue;
	if (!ROOT_KEYS.has(key)) {
		warnings.push(`illegal root key stripped (rule 7): ${key}`);
		continue;
	}
	out[key] = source[key];
}
out.components = components;

/*
 * Rule 1: `anyComponent` and `anyFunction` are the ONLY legal $defs, and they
 * are REQUIRED — common_types.json refers back to `catalog.json#/$defs/
 * anyFunction`, so a catalog that omits them cannot be compiled by a
 * conformant validator at all. (I learned this by trying: ajv resolved
 * common_types and then failed on the dangling back-reference.) They are a
 * discriminated union over everything the catalog declares, which is exactly
 * the sort of thing that should be generated rather than hand-listed.
 */
const anyOf = (map, kind) => ({
	oneOf: Object.keys(map).map((name) => ({ $ref: `#/${kind}/${name}` })),
	discriminator: { propertyName: kind === 'components' ? 'component' : 'call' }
});
out.$defs = { anyComponent: anyOf(components, 'components') };
if (out.functions && Object.keys(out.functions).length > 0) {
	out.$defs.anyFunction = anyOf(out.functions, 'functions');
} else {
	// A catalog with no functions still must satisfy the back-reference.
	out.$defs.anyFunction = { not: {} };
}

const json = JSON.stringify(out, null, '\t') + '\n';

for (const w of warnings) console.warn(`  warn: ${w}`);

if (process.argv.includes('--check')) {
	if (readFileSync(outPath, 'utf8') !== json) {
		console.error(`${outPath} is stale — run the catalog build.`);
		process.exit(1);
	}
	console.log(`${outPath} is up to date`);
} else {
	writeFileSync(outPath, json);
	const inlined = Object.keys(defs).filter((d) => !PROTOCOL_TYPES[d] && d !== 'componentCommon');
	console.log(
		`${outPath}: ${Object.keys(components).length} components, ` +
			`${inlined.length} helpers inlined, ` +
			`${Object.keys(PROTOCOL_TYPES).filter((k) => defs[k]).length} primitives -> common_types`
	);
}
