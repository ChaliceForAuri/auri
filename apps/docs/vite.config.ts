import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
	plugins: [sveltekit()],
	resolve: {
		// Workspace catalogs resolve to source, so the docs app never needs a
		// dist build of @aurilabs/ops. Order matters: exact CSS entry first.
		alias: [
			{
				find: '@aurilabs/ops/theme.css',
				replacement: fileURLToPath(new URL('../../packages/ops/src/lib/theme.css', import.meta.url))
			},
			{
				find: '@aurilabs/ops',
				replacement: fileURLToPath(new URL('../../packages/ops/src/lib/index.ts', import.meta.url))
			}
		]
	}
});
