/**
 * Generates tokens.css from tokens.json (the DTCG source of truth).
 *
 * The one rule that makes auri portable: a mix stays an OPERATION, never a
 * flattened color. On the web that emits a runtime `color-mix()`, so a host
 * overriding `--auri-seed` reseeds the whole palette with no rebuild. A Dart
 * target emits the same recipe as a mix call in the generated theme, so
 * Flutter keeps the identical two-seed API. Flattening here would silently
 * cost every non-CSS platform the feature.
 *
 * usage: node scripts/build-tokens.js [--check]
 *   --check  exit 1 if the committed CSS differs from what this would write
 *            (CI guard: the CSS is generated, so it must never be hand-edited)
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const src = join(here, '..', 'src', 'tokens.json');
const out = join(here, '..', 'src', 'tokens.css');

const tokens = JSON.parse(readFileSync(src, 'utf8'));
const EXT = 'org.aurilabs';
const PREFIX = tokens.$extensions[EXT].cssPrefix;

/** DTCG group/token path -> CSS custom property. Color is the unprefixed group. */
function cssName(group, name, ext) {
	if (ext?.cssName) return ext.cssName; // pinned legacy name — see the naming pass
	return group === 'color' ? `--${PREFIX}-${name}` : `--${PREFIX}-${group}-${name}`;
}

/** `{color.seed-dark}` -> `var(--auri-seed-dark)`; literals pass through. */
function resolve(value) {
	if (Array.isArray(value)) return `cubic-bezier(${value.join(', ')})`;
	if (typeof value !== 'string') return String(value);
	const alias = value.match(/^\{([\w.-]+)\}$/);
	if (!alias) return value;
	const [group, ...rest] = alias[1].split('.');
	const name = rest.join('.');
	// Resolve through the TARGET's extensions so an alias to a pinned-name
	// token still emits that token's real custom property.
	const targetExt = tokens[group]?.[name]?.$extensions?.[EXT];
	return `var(${cssName(group, name, targetExt)})`;
}

function applyMix(base, mix) {
	if (!mix) return base;
	return `color-mix(in ${mix.space}, ${base} ${mix.amount}%, ${mix.with})`;
}

/** Every token in the document, flattened with its group and extensions. */
function* walk() {
	for (const [group, node] of Object.entries(tokens)) {
		if (group.startsWith('$')) continue;
		for (const [name, token] of Object.entries(node)) {
			if (name.startsWith('$')) continue;
			yield { group, name, token, ext: token.$extensions?.[EXT] ?? {} };
		}
	}
}

const lightDecls = [];
const darkDecls = [];
const contrastLight = [];
const contrastDark = [];
const forced = [];

for (const { group, name, token, ext } of walk()) {
	const prop = cssName(group, name, ext);

	lightDecls.push([prop, applyMix(resolve(token.$value), ext.mix)]);

	// Dark is emitted only where a token actually differs — the dark blocks
	// stay small, which is what keeps them readable and auditable.
	if (ext.dark !== undefined || ext.darkMix !== undefined) {
		const base = resolve(ext.dark ?? token.$value);
		darkDecls.push([prop, applyMix(base, ext.darkMix)]);
	}

	if (ext.contrastMore) {
		contrastLight.push([prop, ext.contrastMore.light]);
		contrastDark.push([prop, ext.contrastMore.dark]);
	}
	if (ext.forcedColors) forced.push([prop, ext.forcedColors]);
}

const render = (decls, indent) =>
	decls.map(([prop, value]) => `${indent}${prop}: ${value};`).join('\n');

const css = `/**
 * auri design tokens — GENERATED from tokens.json. Do not edit by hand:
 * \`npm run build:tokens\` regenerates this file, and CI fails if it drifts.
 *
 * The neutral source (tokens.json, DTCG format) is what the React and Flutter
 * targets read too, so every platform gets one palette and the same two-seed
 * reseeding API. See scripts/build-tokens.js for why mixes stay operations.
 *
 * Delivered as plain CSS custom properties at :where() zero specificity, so any
 * host declaration outranks them. Dark keys off the renderer's \`.a2ui-dark\`
 * class (and prefers-color-scheme), so one toggle drives both layers.
 */

:where(:root),
:where(.a2ui-light) {
${render(lightDecls, '\t')}
}

@media (prefers-color-scheme: dark) {
	:where(:root:not(.a2ui-light)) {
${render(darkDecls, '\t\t')}
	}
}

:where(.a2ui-dark) {
${render(darkDecls, '\t')}
}

/* Higher-contrast preference: hairlines strengthen rather than hues shifting. */
@media (prefers-contrast: more) {
	:where(:root),
	:where(.a2ui-light) {
${render(contrastLight, '\t\t')}
	}
	:where(.a2ui-dark) {
${render(contrastDark, '\t\t')}
	}
	@media (prefers-color-scheme: dark) {
		:where(:root) {
${render(contrastDark, '\t\t\t')}
		}
	}
}

/* Forced colors (Windows High Contrast): intents map to system colors. */
@media (forced-colors: active) {
	:where(:root) {
${render(forced, '\t\t')}
	}
}
`;

if (process.argv.includes('--check')) {
	const current = readFileSync(out, 'utf8');
	if (current !== css) {
		console.error('tokens.css is stale — run `npm run build:tokens` in packages/core.');
		process.exit(1);
	}
	console.log('tokens.css is up to date with tokens.json');
} else {
	writeFileSync(out, css);
	console.log(
		`tokens.css written: ${lightDecls.length} tokens, ${darkDecls.length} dark overrides`
	);
}
