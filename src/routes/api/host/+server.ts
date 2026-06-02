import { json } from '@sveltejs/kit';
import { state } from '$lib/server/state.js';
import type { RequestHandler } from './$types.js';

export const POST: RequestHandler = async ({ request }) => {
	const { name, action } = (await request.json()) as { name: string; action: string };

	if (action === 'claim' && !state.host) {
		state.host = name;
	} else if (action === 'release' && state.host === name) {
		state.host = null;
	}

	return json(state);
};
