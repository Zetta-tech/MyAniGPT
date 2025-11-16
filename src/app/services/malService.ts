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
  private clientSecret: string;
  private accessToken: string | null = null;

  private tokenExpiry: number | null = null;

  constructor() {
    this.clientId = process.env.MAL_CLIENT_ID || '';
    this.clientSecret = process.env.MAL_CLIENT_SECRET || '';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  setAccessToken(token: string, expiresIn: number = 2592000) {
    this.accessToken = token;
    this.tokenExpiry = Date.now() + expiresIn * 1000;
  }

  private isTokenExpired(): boolean {
    if (!this.tokenExpiry) return true;
    return Date.now() >= this.tokenExpiry;
  }

  private async makeRequest<T>(endpoint: string, params: Record<string, string> = {}): Promise<T> {
    if (!this.isConfigured()) {
      throw new Error('MAL API credentials not configured. Please set MAL_CLIENT_ID and MAL_CLIENT_SECRET in .env.local');
    }

    if (!this.accessToken || this.isTokenExpired()) {
      throw new Error('No valid access token. Please authenticate first.');
    }

    const url = new URL(`https://api.myanimelist.net/v2${endpoint}`);
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });

    const response = await fetch(url.toString(), {
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`MAL API error (${response.status}): ${errorText}`);
    }

    return response.json();
  }

  async getUserAnimeList(
    username: string = 'Zettaheisinium',
    status?: 'watching' | 'completed' | 'on_hold' | 'dropped' | 'plan_to_watch',
    limit: number = 100
  ): Promise<MALUserAnimeListItem[]> {
    const params: Record<string, string> = {
      fields: 'list_status,alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
      limit: limit.toString(),
    };

    if (status) {
      params.status = status;
    }

    const response = await this.makeRequest<MALUserAnimeListResponse>(
      `/users/${username}/animelist`,
      params
    );

    return response.data;
  }

  async searchAnime(query: string, limit: number = 10): Promise<MALAnime[]> {
    const response = await this.makeRequest<MALAnimeSearchResponse>('/anime', {
      q: query,
      limit: limit.toString(),
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
    limit: number = 20
  ): Promise<MALAnime[]> {
    const response = await this.makeRequest<MALAnimeSearchResponse>('/anime/ranking', {
      ranking_type: rankingType,
      limit: limit.toString(),
      fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
    });

    return response.data.map(item => item.node);
  }

  async getSeasonalAnime(year: number, season: 'winter' | 'spring' | 'summer' | 'fall', limit: number = 20): Promise<MALAnime[]> {
    const response = await this.makeRequest<MALAnimeSearchResponse>(`/anime/season/${year}/${season}`, {
      limit: limit.toString(),
      fields: 'alternative_titles,synopsis,mean,rank,popularity,num_episodes,genres,media_type,status,start_date,rating,studios',
    });

    return response.data.map(item => item.node);
  }


}

export const malService = new MALService();
export type { MALAnime, MALUserAnimeListItem };
