/**
 * Single-source-of-truth plumbing. For every catalog package this copies:
 *
 * - catalog.json -> static/catalogs/<key>/<version>.json, where <version> comes
 *   from the contract's OWN catalogId (never hardcoded) — so the id is a real,
 *   resolving URL on the deployed site
 * - contract/frozen/*.json -> static/catalogs/<key>/  (every previously published
 *   document, so an id that was ever handed out keeps resolving forever)
 * - catalog.json, prompt.md, examples/*.jsonl -> src/lib/generated/<key>/
 *   (the component pages render the actual artifacts: fixtures are the demo
 *   streams, the contract and prompt-pack are excerpted verbatim)
 *
 * Runs before dev/build/check. Everything it writes is generated, gitignored,
 * never edited.
 */

import { copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const CATALOGS = ['ops', 'forms', 'insight'];

/**
 * Where a catalog document is served is decided by the document itself: the
 * path of its own `catalogId`. Not by the package it came from, and never by a
 * hardcoded name.
 *
 * Two bugs made this rule: hardcoding `v1.json` meant minting a new id kept
 * serving the NEW document at the OLD url — the one thing a versioned-url
 * scheme exists to prevent — and deriving the directory from the package name
 * would have moved `intel/v1.json` to `insight/` when the package was renamed,
 * breaking an id we promised to keep resolving. The document's own id survives
 * both.
 */
function servePathOf(doc) {
	const { pathname } = new URL(doc.catalogId);
	const parts = pathname.split('/').filter(Boolean);
	return { catalog: parts.at(-2), filename: parts.at(-1) };
}

const staticRoot = join(here, '..', 'static', 'catalogs');
const served = new Map();

function serve(doc, sourceFile) {
	const { catalog, filename } = servePathOf(doc);
	const url = `${catalog}/${filename}`;
	if (served.has(url)) {
		throw new Error(`two documents claim ${url}: ${served.get(url)} and ${sourceFile}`);
	}
	served.set(url, sourceFile);
	const dir = join(staticRoot, catalog);
	mkdirSync(dir, { recursive: true });
	copyFileSync(sourceFile, join(dir, filename));
	return { catalog, filename };
}

for (const key of CATALOGS) {
	const contract = join(here, '..', '..', '..', 'packages', key, 'contract');

	const currentFile = join(contract, 'catalog.json');
	const current = JSON.parse(readFileSync(currentFile, 'utf8'));
	const { catalog } = serve(current, currentFile);
	const catalogDir = join(staticRoot, catalog);

	// Every id ever published keeps resolving; see contract/frozen/README.md.
	const frozenDir = join(contract, 'frozen');
	if (existsSync(frozenDir)) {
		for (const f of readdirSync(frozenDir).filter((f) => f.endsWith('.json'))) {
			const file = join(frozenDir, f);
			serve(JSON.parse(readFileSync(file, 'utf8')), file);
		}
	}

	// The prompt-pack and fixtures are served too — agents (and llms.txt) fetch them.
	copyFileSync(join(contract, 'prompt.md'), join(catalogDir, 'prompt.md'));
	cpSync(join(contract, 'examples'), join(catalogDir, 'examples'), { recursive: true });

	const generated = join(here, '..', 'src', 'lib', 'generated', key);
	mkdirSync(generated, { recursive: true });
	copyFileSync(currentFile, join(generated, 'catalog.json'));
	copyFileSync(join(contract, 'prompt.md'), join(generated, 'prompt.md'));
	cpSync(join(contract, 'examples'), join(generated, 'examples'), { recursive: true });
}

console.log(
	`contract artifacts synced (${CATALOGS.join(', ')}) -> static/catalogs, src/lib/generated\n` +
		`  ids served: ${[...served.keys()].sort().join(', ')}`
);
