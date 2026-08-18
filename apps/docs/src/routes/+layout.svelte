<script lang="ts">
	import 'svelte-a2ui/theme.css';
	import '@aurilabs/ops/theme.css';
	import '../app.css';
	import { base } from '$app/paths';
	import { onMount } from 'svelte';

	let { children } = $props();

	let dark = $state(false);
	onMount(() => {
		dark = document.documentElement.classList.contains('a2ui-dark');
	});

	function toggle() {
		dark = !dark;
		document.documentElement.classList.toggle('a2ui-dark', dark);
		try {
			localStorage.setItem('auri-theme', dark ? 'dark' : 'light');
		} catch {
			/* private mode */
		}
	}
</script>

<header>
	<a class="wordmark" href="{base}/">auri</a>
	<nav>
		<a href="{base}/">console</a>
		<a href="{base}/sheet">sheet</a>
		<a href="https://github.com/ChaliceForAuri/auri">github</a>
		<button type="button" onclick={toggle} aria-pressed={dark}>
			{dark ? 'light' : 'dark'}
		</button>
	</nav>
</header>

<main>
	{@render children()}
</main>

<footer>
	built by <a href="https://github.com/ChaliceForAuri">Hugo Pretorius</a> · agent-facing component
	catalogs for <a href="https://a2ui.org">A2UI</a> · Apache-2.0
</footer>
