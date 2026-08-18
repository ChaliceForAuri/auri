/**
 * The catalog id is a real URL — this copies the contract into static/ so the
 * docs site serves https://chaliceforauri.github.io/auri/catalogs/ops/v1.json
 * for real. Runs before dev and build; static/catalogs is generated, not
 * source of truth.
 */

import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', '..', '..', 'packages', 'ops', 'contract', 'catalog.json');
const targetDir = join(here, '..', 'static', 'catalogs', 'ops');

mkdirSync(targetDir, { recursive: true });
copyFileSync(source, join(targetDir, 'v1.json'));
console.log('contract synced -> static/catalogs/ops/v1.json');
