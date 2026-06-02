import { json } from '@sveltejs/kit';
import { state } from '$lib/server/state.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const { action } = (await request.json()) as { action: string };

	switch (action) {
		case 'skip':
			state.nowPlaying = state.queue.shift() ?? null;
			state.isPaused = false;
			break;
		case 'pause':
			if (state.nowPlaying) state.isPaused = !state.isPaused;
			break;
		case 'stop':
			state.nowPlaying = null;
			state.queue = [];
			state.isPaused = false;
			break;
	}

	return json(state);
};
