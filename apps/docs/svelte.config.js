import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		// GitHub Pages serves at /auri; local dev at /.
		paths: { base: process.env.BASE_PATH ?? '' },
		// Workspace catalog resolves to source for vite AND typescript — a fresh
		// checkout has no packages/ops/dist, so the package's `types` field
		// can't be the resolution path (CI check failed exactly that way).
		alias: {
			'@aurilabs/ops/theme.css': '../../packages/ops/src/lib/theme.css',
			'@aurilabs/ops': '../../packages/ops/src/lib/index.ts',
			'@aurilabs/forms/theme.css': '../../packages/forms/src/lib/theme.css',
			'@aurilabs/forms': '../../packages/forms/src/lib/index.ts',
			'@aurilabs/insight/theme.css': '../../packages/insight/src/lib/theme.css',
			'@aurilabs/insight': '../../packages/insight/src/lib/index.ts'
		}
	}
};

export default config;
