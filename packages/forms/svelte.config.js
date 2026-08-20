import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

// Library-only package: svelte-package reads src/lib directly; no SvelteKit app
// here (the docs app lives in apps/docs), so no adapter and no svelte-kit sync.
/** @type {import('@sveltejs/vite-plugin-svelte').SvelteConfig} */
const config = {
	preprocess: vitePreprocess()
};

export default config;
