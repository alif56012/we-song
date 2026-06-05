<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { locale } from '$lib/i18n';

	let { children } = $props();

	$effect(() => {
		document.documentElement.lang = $locale;
	});
</script>

<svelte:head><link rel="icon" href={favicon} /></svelte:head>
{@render children()}
