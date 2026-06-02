import { json, error } from '@sveltejs/kit';
import { randomUUID } from 'crypto';
import { state } from '$lib/server/state.js';
import type { RequestHandler } from './$types.js';

function extractVideoId(url: string): string | null {
	const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
	return m ? m[1] : null;
}

async function fetchTitle(videoId: string): Promise<string> {
	try {
		const res = await fetch(
			`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
		);
		if (res.ok) {
			const data = (await res.json()) as { title: string };
			return data.title;
		}
	} catch {}
	return 'Unknown Title';
}

export const POST: RequestHandler = async ({ request }) => {
	const { url, name } = (await request.json()) as { url: string; name: string };

	const videoId = extractVideoId(url);
	if (!videoId) throw error(400, 'Invalid YouTube URL');

	const title = await fetchTitle(videoId);
	const song = {
		id: randomUUID(),
		url,
		videoId,
		title,
		addedBy: name || 'Anonymous',
		addedAt: Date.now()
	};

	if (!state.nowPlaying) {
		state.nowPlaying = song;
		state.isPaused = false;
	} else {
		state.queue.push(song);
	}

	return json(state);
};
