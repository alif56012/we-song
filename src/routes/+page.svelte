<script lang="ts">
	import { onMount } from 'svelte';
	import type { AppState } from '$lib/types.js';

	let myName = $state('');
	let nameInput = $state('');
	let nameSet = $state(false);

	let appState = $state<AppState>({
		queue: [],
		nowPlaying: null,
		isPaused: false,
		host: null
	});

	let urlInput = $state('');
	let addError = $state('');
	let adding = $state(false);

	let isHost = $derived(!!myName && appState.host === myName);

	// YouTube player state (non-reactive)
	let ytPlayer: any = null;
	let ytReady = false;
	let currentVideoId = '';
	let lastPaused = false;

	let pollInterval: ReturnType<typeof setInterval>;

	function loadYouTubeAPI(): Promise<void> {
		return new Promise((resolve) => {
			if ((window as any).YT?.Player) return resolve();
			const prev = (window as any).onYouTubeIframeAPIReady;
			(window as any).onYouTubeIframeAPIReady = () => {
				prev?.();
				resolve();
			};
			if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
				const script = document.createElement('script');
				script.src = 'https://www.youtube.com/iframe_api';
				document.head.appendChild(script);
			}
		});
	}

	function initPlayer(node: HTMLElement) {
		let aborted = false;
		const playerDiv = document.createElement('div');
		node.appendChild(playerDiv);

		loadYouTubeAPI().then(() => {
			if (aborted) return;
			ytPlayer = new (window as any).YT.Player(playerDiv, {
				height: '100%',
				width: '100%',
				videoId: appState.nowPlaying?.videoId ?? '',
				playerVars: { autoplay: 1, rel: 0, playsinline: 1 },
				events: {
					onReady: () => {
						ytReady = true;
						currentVideoId = appState.nowPlaying?.videoId ?? '';
						lastPaused = appState.isPaused;
					},
					onStateChange: (e: any) => {
						if (e.data === 0) control('skip');
					}
				}
			});
		});

		return {
			destroy() {
				aborted = true;
				if (ytPlayer) {
					ytPlayer.destroy();
					ytPlayer = null;
					ytReady = false;
					currentVideoId = '';
				}
			}
		};
	}

	async function poll() {
		try {
			const res = await fetch('/api/state');
			if (!res.ok) return;
			const data: AppState = await res.json();

			if (ytReady && ytPlayer) {
				const newVid = data.nowPlaying?.videoId ?? '';
				if (newVid !== currentVideoId) {
					if (newVid) ytPlayer.loadVideoById(newVid);
					else ytPlayer.stopVideo();
					currentVideoId = newVid;
					lastPaused = false;
				}
				if (data.nowPlaying && data.isPaused !== lastPaused) {
					if (data.isPaused) ytPlayer.pauseVideo();
					else ytPlayer.playVideo();
					lastPaused = data.isPaused;
				}
			}

			appState = data;
		} catch {}
	}

	function setName() {
		const trimmed = nameInput.trim();
		if (!trimmed) return;
		myName = trimmed;
		localStorage.setItem('we-song-name', trimmed);
		nameSet = true;
	}

	async function addSong() {
		if (!urlInput.trim() || !nameSet) return;
		adding = true;
		addError = '';
		try {
			const res = await fetch('/api/queue', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ url: urlInput.trim(), name: myName })
			});
			if (res.ok) {
				appState = await res.json();
				urlInput = '';
			} else {
				addError = 'Invalid YouTube URL';
			}
		} catch {
			addError = 'Failed to add song';
		}
		adding = false;
	}

	async function control(action: string) {
		try {
			const res = await fetch('/api/control', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action })
			});
			if (res.ok) appState = await res.json();
		} catch {}
	}

	async function claimHost() {
		const res = await fetch('/api/host', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: myName, action: 'claim' })
		});
		if (res.ok) appState = await res.json();
	}

	async function releaseHost() {
		const res = await fetch('/api/host', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: myName, action: 'release' })
		});
		if (res.ok) appState = await res.json();
	}

	onMount(() => {
		const saved = localStorage.getItem('we-song-name');
		if (saved) {
			myName = saved;
			nameInput = saved;
			nameSet = true;
		}

		poll();
		pollInterval = setInterval(poll, 2500);

		window.addEventListener('beforeunload', () => {
			if (isHost) {
				navigator.sendBeacon(
					'/api/host',
					new Blob([JSON.stringify({ name: myName, action: 'release' })], {
						type: 'application/json'
					})
				);
			}
		});

		return () => clearInterval(pollInterval);
	});
</script>

<svelte:head>
	<title>WE SONG</title>
</svelte:head>

<main class="min-h-screen bg-zinc-950 text-white">
	<div class="mx-auto max-w-2xl space-y-4 p-4">
		<!-- Header -->
		<header class="pt-4 text-center">
			<h1 class="text-4xl font-black tracking-tight">WE SONG</h1>
			<p class="mt-1 text-sm text-zinc-500">Team Music Queue</p>
		</header>

		<!-- Name setup -->
		<div class="rounded-xl bg-zinc-900 p-4">
			{#if !nameSet}
				<p class="mb-3 text-sm text-zinc-400">Enter your name to get started</p>
				<form onsubmit={(e) => { e.preventDefault(); setName(); }} class="flex gap-2">
					<input
						bind:value={nameInput}
						placeholder="Your name..."
						maxlength="30"
						class="flex-1 rounded-lg bg-zinc-800 px-3 py-2 text-sm placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500"
					/>
					<button
						type="submit"
						class="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
					>
						Set
					</button>
				</form>
			{:else}
				<div class="flex items-center justify-between">
					<span class="text-sm text-zinc-400">
						Hi, <span class="font-semibold text-white">{myName}</span>
						{#if isHost}
							<span class="ml-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs font-bold">HOST</span>
						{/if}
					</span>
					<button
						onclick={() => { nameSet = false; }}
						class="text-xs text-zinc-600 hover:text-zinc-400"
					>
						Change name
					</button>
				</div>
			{/if}
		</div>

		<!-- Now Playing -->
		{#if appState.nowPlaying}
			<div class="rounded-xl bg-zinc-900 p-4">
				<p class="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Now Playing</p>

				{#if isHost}
					<!-- YouTube Player for host -->
					<div class="mb-4 aspect-video overflow-hidden rounded-lg bg-black" use:initPlayer></div>
				{:else}
					<!-- Visual indicator for non-hosts -->
					<div class="mb-4 flex items-center gap-3 rounded-lg bg-zinc-800 p-3">
						<div class="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600">
							<span class="text-lg">▶</span>
						</div>
						<div class="min-w-0">
							<a
								href={appState.nowPlaying.url}
								target="_blank"
								rel="noopener noreferrer"
								class="block truncate text-sm font-semibold hover:text-violet-400"
							>
								{appState.nowPlaying.title}
							</a>
							<p class="text-xs text-zinc-500">added by {appState.nowPlaying.addedBy}</p>
						</div>
					</div>
				{/if}

				{#if isHost}
					<p class="mb-3 truncate text-sm font-semibold">{appState.nowPlaying.title}</p>
					<p class="mb-3 text-xs text-zinc-500">added by {appState.nowPlaying.addedBy}</p>
				{/if}

				<!-- Playback controls -->
				<div class="flex gap-2">
					{#if appState.nowPlaying}
						<button
							onclick={() => control('pause')}
							class="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
						>
							{appState.isPaused ? '▶ Resume' : '⏸ Pause'}
						</button>
						<button
							onclick={() => control('skip')}
							class="flex-1 rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
						>
							⏭ Skip
						</button>
						<button
							onclick={() => control('stop')}
							class="rounded-lg bg-red-900 px-4 py-2 text-sm font-semibold hover:bg-red-800"
						>
							⏹ Stop
						</button>
					{/if}
				</div>
			</div>
		{:else}
			<div class="rounded-xl bg-zinc-900 p-6 text-center">
				<p class="text-2xl">🎵</p>
				<p class="mt-2 text-sm text-zinc-500">No song playing — add one below</p>
			</div>
		{/if}

		<!-- Add Song -->
		{#if nameSet}
			<div class="rounded-xl bg-zinc-900 p-4">
				<p class="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Add Song</p>
				<form onsubmit={(e) => { e.preventDefault(); addSong(); }} class="space-y-2">
					<input
						bind:value={urlInput}
						placeholder="https://youtube.com/watch?v=..."
						class="w-full rounded-lg bg-zinc-800 px-3 py-2 text-sm placeholder-zinc-600 outline-none focus:ring-2 focus:ring-violet-500"
					/>
					{#if addError}
						<p class="text-xs text-red-400">{addError}</p>
					{/if}
					<button
						type="submit"
						disabled={adding || !urlInput.trim()}
						class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500 disabled:opacity-50"
					>
						{adding ? 'Adding...' : '+ Add to Queue'}
					</button>
				</form>
			</div>
		{/if}

		<!-- Queue -->
		<div class="rounded-xl bg-zinc-900 p-4">
			<p class="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">
				Queue {appState.queue.length > 0 ? `(${appState.queue.length})` : ''}
			</p>
			{#if appState.queue.length === 0}
				<p class="text-center text-sm text-zinc-600 py-4">Queue is empty</p>
			{:else}
				<ul class="space-y-2">
					{#each appState.queue as song, i (song.id)}
						<li class="flex items-center gap-3 rounded-lg bg-zinc-800 p-3">
							<span class="w-5 shrink-0 text-center text-xs text-zinc-600">{i + 1}</span>
							<div class="min-w-0 flex-1">
								<a
									href={song.url}
									target="_blank"
									rel="noopener noreferrer"
									class="block truncate text-sm hover:text-violet-400"
								>
									{song.title}
								</a>
								<p class="text-xs text-zinc-600">by {song.addedBy}</p>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>

		<!-- Host section -->
		{#if nameSet}
			<div class="rounded-xl bg-zinc-900 p-4">
				<p class="mb-3 text-xs font-bold uppercase tracking-widest text-zinc-500">Host</p>
				{#if !appState.host}
					<p class="mb-3 text-sm text-zinc-400">No host — the host plays music through their browser</p>
					<button
						onclick={claimHost}
						class="w-full rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold hover:bg-violet-500"
					>
						🎧 Become Host
					</button>
				{:else if isHost}
					<p class="mb-3 text-sm text-zinc-400">You are the host — music plays through your browser</p>
					<button
						onclick={releaseHost}
						class="w-full rounded-lg bg-zinc-800 px-4 py-2 text-sm font-semibold hover:bg-zinc-700"
					>
						Release Host
					</button>
				{:else}
					<p class="text-sm text-zinc-400">
						<span class="font-semibold text-white">{appState.host}</span> is the host
					</p>
				{/if}
			</div>
		{/if}

		<div class="pb-8"></div>
	</div>
</main>
