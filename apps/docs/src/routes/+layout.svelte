<script lang="ts">
	import 'svelte-a2ui/theme.css';
	import '@aurilabs/ops/theme.css';
	import '../app.css';
	import { base } from '$app/paths';
	import { page } from '$app/state';
	import { onMount } from 'svelte';

	let { children } = $props();

	let dark = $state(false);
	onMount(() => {
		dark = document.documentElement.classList.contains('a2ui-dark');
	});

	function toggle() {
		dark = !dark;
		const el = document.documentElement;
		// Explicit classes both ways: the light choice must beat a dark OS
		// (the dark media block is guarded with :not(.a2ui-light)).
		el.classList.toggle('a2ui-dark', dark);
		el.classList.toggle('a2ui-light', !dark);
		try {
			localStorage.setItem('auri-theme', dark ? 'dark' : 'light');
		} catch {
			/* private mode */
		}
	}

	const links = [
		{ href: '/', label: 'console' },
		{ href: '/components', label: 'components' },
		{ href: '/playground', label: 'playground' },
		{ href: '/foundations', label: 'foundations' },
		{ href: '/install', label: 'install' },
		{ href: '/evals', label: 'evals' },
		{ href: '/sheet', label: 'sheet' }
	];

	const path = $derived(page.url.pathname);
	const isActive = (href: string) => {
		const full = base + href;
		return href === '/' ? path === full || path === full + '/' : path.startsWith(full);
	};
</script>

<header>
	<div class="header-inner">
		<a class="wordmark" href="{base}/"
			><img class="mark" src="{base}/favicon.svg" alt="" aria-hidden="true" />auri</a
		>
		<nav>
			{#each links as l (l.href)}
				<a href="{base}{l.href}" class:active={isActive(l.href)}>{l.label}</a>
			{/each}
			<a href="https://github.com/ChaliceForAuri/auri" class="ext">github</a>
			<button
				type="button"
				class="theme-toggle"
				onclick={toggle}
				aria-pressed={dark}
				aria-label={dark ? 'switch to light theme' : 'switch to dark theme'}
			>
				{#if dark}
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"
						><circle cx="12" cy="12" r="4"></circle><path
							d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"
						></path></svg
					>
				{:else}
					<svg
						width="15"
						height="15"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
						aria-hidden="true"><path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z"></path></svg
					>
				{/if}
			</button>
		</nav>
	</div>
</header>

<main>
	{@render children()}
</main>

<footer>
	built by <a href="https://github.com/ChaliceForAuri">Hugo Pretorius</a> · agent-facing component
	catalogs for <a href="https://a2ui.org">A2UI</a> · Apache-2.0
</footer>
