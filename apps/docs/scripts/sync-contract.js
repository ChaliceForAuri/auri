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

const CATALOGS = ['ops', 'forms', 'intel'];

for (const key of CATALOGS) {
	const contract = join(here, '..', '..', '..', 'packages', key, 'contract');

	const catalogDir = join(here, '..', 'static', 'catalogs', key);
	mkdirSync(catalogDir, { recursive: true });

	/*
	 * The filename comes from the contract's own catalogId. Hardcoding 'v1.json'
	 * meant that minting a new id silently kept serving the new document at the
	 * OLD url — the one thing a versioned-url scheme exists to prevent.
	 */
	const current = JSON.parse(readFileSync(join(contract, 'catalog.json'), 'utf8'));
	const filename = current.catalogId.split('/').pop();
	copyFileSync(join(contract, 'catalog.json'), join(catalogDir, filename));

	// Every id ever published keeps resolving; see contract/frozen/README.md.
	// intel has no frozen/ yet: it keeps its published id until the insight rename
	// supersedes it, at which point intel/v1.json freezes like the others.
	const frozenDir = join(contract, 'frozen');
	if (existsSync(frozenDir)) {
		for (const f of readdirSync(frozenDir).filter((f) => f.endsWith('.json'))) {
			if (f === filename) throw new Error(`${key}: frozen/${f} collides with the current contract`);
			copyFileSync(join(frozenDir, f), join(catalogDir, f));
		}
	}
	// The prompt-pack and fixtures are served too — agents (and llms.txt) fetch them.
	copyFileSync(join(contract, 'prompt.md'), join(catalogDir, 'prompt.md'));
	cpSync(join(contract, 'examples'), join(catalogDir, 'examples'), { recursive: true });

	const generated = join(here, '..', 'src', 'lib', 'generated', key);
	mkdirSync(generated, { recursive: true });
	copyFileSync(join(contract, 'catalog.json'), join(generated, 'catalog.json'));
	copyFileSync(join(contract, 'prompt.md'), join(generated, 'prompt.md'));
	cpSync(join(contract, 'examples'), join(generated, 'examples'), { recursive: true });
}

console.log(
	`contract artifacts synced (${CATALOGS.join(', ')}) -> static/catalogs, src/lib/generated`
);
