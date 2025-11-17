interface MALAnime {
    id: number;
    title: string;
    main_picture?: {
        medium: string;
        large: string;
    };
    alternative_titles?: {
        synonyms: string[];
        en: string;
        ja: string;
    };
    start_date?: string;
    end_date?: string;
    synopsis?: string;
    mean?: number;
    rank?: number;
    popularity?: number;
    num_list_users?: number;
    num_scoring_users?: number;
    nsfw?: string;
    genres?: Array<{ id: number; name: string }>;
    media_type?: string;
    status?: string;
    num_episodes?: number;
    start_season?: {
        year: number;
        season: string;
    };
    rating?: string;
    studios?: Array<{ id: number; name: string }>;
}

interface MALUserAnimeListItem {
    node: MALAnime;
    list_status: {
        status: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch';
        score: number;
        num_episodes_watched: number;
        is_rewatching: boolean;
        updated_at: string;
    };
}

interface MALUserAnimeListResponse {
    data: MALUserAnimeListItem[];
    paging: {
        next?: string;
        previous?: string;
    };
}

interface MALAnimeSearchResponse {
    data: Array<{
        node: MALAnime;
    }>;
    paging: {
        next?: string;
    };
}

class MALService {
    private clientId: string;
    private accessToken: string | null = null;

    constructor() {
        this.clientId = process.env.MAL_CLIENT_ID || '';
        this.accessToken = process.env.MAL_ACCESS_TOKEN || null;
    }

    isConfigured(): boolean {
        return !!this.clientId;
    }

    hasAccessToken(): boolean {
        return !!this.accessToken;
    }

    private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}, method: string = 'GET', body?: URLSearchParams): Promise<T> {
        if (!this.clientId) {
            throw new Error('MAL_CLIENT_ID not configured');
        }

        const url = new URL(`https://api.myanimelist.net/v2${endpoint}`);
        Object.entries(params).forEach(([key, value]) => {
            url.searchParams.append(key, value);
        });

        const headers: Record<string, string> = this.accessToken
            ? { 'Authorization': `Bearer ${this.accessToken}` }
            : { 'X-MAL-CLIENT-ID': this.clientId };

        const options: RequestInit = { method, headers };

        if (body && method !== 'GET') {
            options.body = body;
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
        }

        const response = await fetch(url.toString(), options);

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`MAL API error (${response.status}): ${errorText}`);
        }

        return response.json();
    }

    async getUserAnimeList(
        username: string = 'Zettaheisinium',
        status?: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch',
        limit: number = 100,
        offset: number = 0,
        sort?: 'list_score' | 'list_updated_at' | 'anime_title' | 'anime_start_date' | 'anime_id'
    ): Promise<MALUserAnimeListItem[]> {
        const params: Record<string, string> = {
            fields: 'list_status,alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
            limit: Math.min(limit, 1000).toString(),
            offset: offset.toString(),
        };

        if (status) {
            params.status = status;
        }

        if (sort) {
            params.sort = sort;
        }

        const response = await this.makeRequest<MALUserAnimeListResponse>(
            `/users/${username}/animelist`,
            params
        );

        return response.data;
    }

    async searchAnime(query: string, limit: number = 10, offset: number = 0): Promise<MALAnime[]> {
        const response = await this.makeRequest<MALAnimeSearchResponse>('/anime', {
            q: query,
            limit: Math.min(limit, 100).toString(),
            offset: offset.toString(),
            fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
        });

        return response.data.map(item => item.node);
    }

    async getAnimeDetails(animeId: number): Promise<MALAnime> {
        const response = await this.makeRequest<MALAnime>(`/anime/${animeId}`, {
            fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,end_date,rating,studios,pictures,related_anime,recommendations',
        });

        return response;
    }

    async getAnimeRanking(
        rankingType: 'all' | 'airing' | 'upcoming' | 'tv' | 'ova' | 'movie' | 'special' | 'bypopularity' | 'favorite' = 'all',
        limit: number = 20,
        offset: number = 0
    ): Promise<MALAnime[]> {
        const response = await this.makeRequest<MALAnimeSearchResponse>('/anime/ranking', {
            ranking_type: rankingType,
            limit: Math.min(limit, 500).toString(),
            offset: offset.toString(),
            fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
        });

        return response.data.map(item => item.node);
    }

    async getSeasonalAnime(year: number, season: 'winter' | 'spring' | 'summer' | 'fall', limit: number = 20, offset: number = 0): Promise<MALAnime[]> {
        const response = await this.makeRequest<MALAnimeSearchResponse>(`/anime/season/${year}/${season}`, {
            limit: Math.min(limit, 500).toString(),
            offset: offset.toString(),
            fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
        });

        return response.data.map(item => item.node);
    }

    async updateAnimeListStatus(
        animeId: number,
        status?: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch',
        score?: number,
        numWatchedEpisodes?: number
    ): Promise<any> {
        if (!this.hasAccessToken()) {
            throw new Error('Access token required for updating anime list');
        }

        const body = new URLSearchParams();
        if (status) body.append('status', status);
        if (score !== undefined) body.append('score', score.toString());
        if (numWatchedEpisodes !== undefined) body.append('num_watched_episodes', numWatchedEpisodes.toString());

        return this.makeRequest(`/anime/${animeId}/my_list_status`, {}, 'PUT', body);
    }
}

export const malService = new MALService();
export type { MALAnime, MALUserAnimeListItem };
