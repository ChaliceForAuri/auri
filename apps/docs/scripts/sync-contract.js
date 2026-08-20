/**
 * Single-source-of-truth plumbing. For every catalog package this copies:
 *
 * - catalog.json -> static/catalogs/<key>/v1.json  (the catalog id is a real,
 *   resolving URL on the deployed site)
 * - catalog.json, prompt.md, examples/*.jsonl -> src/lib/generated/<key>/
 *   (the component pages render the actual artifacts: fixtures are the demo
 *   streams, the contract and prompt-pack are excerpted verbatim)
 *
 * Runs before dev/build/check. Everything it writes is generated, gitignored,
 * never edited.
 */

import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

const CATALOGS = ['ops', 'forms'];

for (const key of CATALOGS) {
	const contract = join(here, '..', '..', '..', 'packages', key, 'contract');

	const catalogDir = join(here, '..', 'static', 'catalogs', key);
	mkdirSync(catalogDir, { recursive: true });
	copyFileSync(join(contract, 'catalog.json'), join(catalogDir, 'v1.json'));
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
