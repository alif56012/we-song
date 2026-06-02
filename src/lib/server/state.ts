import type { AppState } from '$lib/types.js';

export const state: AppState = {
	queue: [],
	nowPlaying: null,
	isPaused: false,
	host: null
};
