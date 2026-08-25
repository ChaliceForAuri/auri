import { defineConfig } from 'vitest/config';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { playwright } from '@vitest/browser-playwright';

/**
 * Browser tests only — fixture replays through a real A2uiClient + Surface,
 * plus interaction tests for two-way binding, checks, and the submit gate.
 * Contract tests stay on `node --test`.
 */
export default defineConfig({
	plugins: [svelte()],
	test: {
		include: ['tests/browser/**/*.test.ts'],
		browser: {
			enabled: true,
			headless: true,
			provider: playwright(),
			instances: [{ browser: 'chromium' }],
			screenshotFailures: false
		}
	}
});
