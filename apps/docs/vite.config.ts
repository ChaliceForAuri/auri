import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

// Workspace aliases live in svelte.config.js (kit.alias), which feeds both
// vite and the generated tsconfig paths.
export default defineConfig({
	plugins: [sveltekit()]
});
