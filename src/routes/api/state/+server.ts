import { json } from '@sveltejs/kit';
import { state } from '$lib/server/state.js';

export function GET() {
	return json(state);
}
