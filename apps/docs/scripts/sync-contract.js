/**
 * Single-source-of-truth plumbing. From packages/ops/contract this copies:
 *
 * - catalog.json -> static/catalogs/ops/v1.json  (the catalog id is a real,
 *   resolving URL on the deployed site)
 * - catalog.json, prompt.md, examples/*.jsonl -> src/lib/generated/  (the
 *   component pages render the actual artifacts: fixtures are the demo
 *   streams, the contract and prompt-pack are excerpted verbatim)
 *
 * Runs before dev/build/check. Everything it writes is generated, gitignored,
 * never edited.
 */

import { copyFileSync, cpSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const contract = join(here, '..', '..', '..', 'packages', 'ops', 'contract');

const catalogDir = join(here, '..', 'static', 'catalogs', 'ops');
mkdirSync(catalogDir, { recursive: true });
copyFileSync(join(contract, 'catalog.json'), join(catalogDir, 'v1.json'));

const generated = join(here, '..', 'src', 'lib', 'generated');
mkdirSync(generated, { recursive: true });
copyFileSync(join(contract, 'catalog.json'), join(generated, 'catalog.json'));
copyFileSync(join(contract, 'prompt.md'), join(generated, 'prompt.md'));
cpSync(join(contract, 'examples'), join(generated, 'examples'), { recursive: true });

console.log('contract artifacts synced -> static/catalogs, src/lib/generated');
