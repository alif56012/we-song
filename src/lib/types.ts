export interface Song {
	id: string;
	url: string;
	videoId: string;
	title: string;
	addedBy: string;
	addedAt: number;
}

export interface AppState {
	queue: Song[];
	nowPlaying: Song | null;
	isPaused: boolean;
	host: string | null;
}
