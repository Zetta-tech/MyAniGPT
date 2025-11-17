import { tool } from '@openai/agents';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { malService } from '../services/malService';

// ============================================
// PART 1: USER-SPECIFIC ANIME LIST TOOLS
// ============================================

const getUserAnimeList = tool({
    name: 'get_user_anime_list',
    description: 'Get the user\'s anime list from MyAnimeList with filtering and sorting options. Use this to see what anime the user has watched, is watching, or plans to watch. Supports status filtering (watching, completed, on_hold, dropped, plan_to_watch) and sorting (list_score, list_updated_at, anime_title, anime_start_date, anime_id).',
    parameters: z.object({
        status: z.enum(['watching', 'completed', 'on_hold', 'dropped', 'plan_to_watch', 'none']).default('none')
            .describe('Filter by anime status: watching, completed, on_hold, dropped, plan_to_watch, or none for all statuses'),
        sort: z.enum(['list_score', 'list_updated_at', 'anime_title', 'anime_start_date', 'anime_id', 'none']).default('none')
            .describe('Sort by: list_score (descending), list_updated_at (descending), anime_title (ascending), anime_start_date (descending), anime_id (ascending), or none for default sorting'),
        limit: z.number().min(1).max(1000).default(100)
            .describe('Number of anime to return (max 1000)'),
        offset: z.number().min(0).default(0)
            .describe('Offset for pagination'),
    }),
    execute: async ({ status, sort, limit = 100, offset = 0 }) => {
        const username = '@me';
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const actualStatus = status !== 'none' ? status : undefined;
            const actualSort = sort !== 'none' ? sort : undefined;

            const animeList = await malService.getUserAnimeList(username, actualStatus, limit, offset, actualSort);
            if (animeList.length === 0) {
                return actualStatus
                    ? `User has no anime with status "${actualStatus}" in their list.`
                    : `User has no anime in their list or the list is private.`;
            }

            const formatted = animeList.map((item, i) => {
                const anime = item.node;
                const listStatus = item.list_status;
                return `${offset + i + 1}. ${anime.title}
   Status: ${listStatus.status} | Episodes: ${listStatus.num_episodes_watched}/${anime.num_episodes || '?'}
   Score: ${listStatus.score || 'N/A'}/10 | MAL Score: ${anime.mean || 'N/A'}/10
   Updated: ${listStatus.updated_at || 'N/A'}`;
            }).join('\n\n');

            return `User's anime list${actualStatus ? ` (${actualStatus})` : ''}${actualSort ? ` sorted by ${actualSort}` : ''} (showing ${animeList.length} results, offset ${offset}):\n\n${formatted}`;
        } catch (error: any) {
            return `Error fetching anime list: ${error.message}`;
        }
    },
});

// ============================================
// PART 2: GENERAL ANIME SEARCH TOOLS
// ============================================

const searchAnime = tool({
    name: 'search_anime',
    description: 'Search for anime on MyAnimeList database by title. Use this to find anime details, ratings, and information. Returns up to 100 results with pagination support.',
    parameters: z.object({
        query: z.string().describe('The anime title or search query'),
        limit: z.number().min(1).max(100).default(10)
            .describe('Number of results to return (max 100)'),
        offset: z.number().min(0).default(0)
            .describe('Offset for pagination'),
    }),
    execute: async ({ query, limit = 10, offset = 0 }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const results = await malService.searchAnime(query, limit, offset);
            if (results.length === 0) {
                return `No anime found for "${query}" on MyAnimeList.`;
            }
            const formatted = results.map((anime, index) => {
                return `${offset + index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10 | Rank: #${anime.rank || 'N/A'}
   Status: ${anime.status || 'Unknown'}
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}
   Synopsis: ${anime.synopsis?.substring(0, 150) || 'No synopsis available'}...`;
            }).join('\n\n');
            return `Search results for "${query}" on MyAnimeList (showing ${results.length} results, offset ${offset}):\n\n${formatted}`;
        } catch (error: any) {
            return `Error searching anime on MAL: ${error.message}`;
        }
    },
});

const getAnimeRankings = tool({
    name: 'get_anime_rankings',
    description: 'Get top-ranked anime from MyAnimeList by various ranking types. Use this to recommend popular or highly-rated anime. Supports ranking by: all (top rated), airing, upcoming, tv, ova, movie, special, bypopularity, favorite.',
    parameters: z.object({
        rankingType: z.enum(['all', 'airing', 'upcoming', 'tv', 'ova', 'movie', 'special', 'bypopularity', 'favorite']).default('all')
            .describe('Type of ranking: all (Top Anime Series), airing (Top Airing), upcoming (Top Upcoming), tv (Top TV Series), ova (Top OVA), movie (Top Movies), special (Top Specials), bypopularity (Top by Popularity), favorite (Top Favorited)'),
        limit: z.number().min(1).max(500).default(20)
            .describe('Number of results to return (max 500)'),
        offset: z.number().min(0).default(0)
            .describe('Offset for pagination'),
    }),
    execute: async ({ rankingType, limit = 20, offset = 0 }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const rankings = await malService.getAnimeRanking(rankingType, limit, offset);
            if (rankings.length === 0) {
                return `No rankings found for type "${rankingType}".`;
            }
            const formatted = rankings.map((anime, index) => {
                return `${offset + index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10 | Rank: #${anime.rank || 'N/A'}
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}`;
            }).join('\n\n');
            return `Top ${rankingType} anime on MyAnimeList (showing ${rankings.length} results, offset ${offset}):\n\n${formatted}`;
        } catch (error: any) {
            return `Error fetching anime rankings: ${error.message}`;
        }
    },
});

const getSeasonalAnime = tool({
    name: 'get_seasonal_anime',
    description: 'Get anime from a specific season and year. Use this to find what anime aired or is airing in a particular season.',
    parameters: z.object({
        year: z.number().describe('Year (e.g., 2024)'),
        season: z.enum(['winter', 'spring', 'summer', 'fall']).describe('Season: winter, spring, summer, or fall'),
        limit: z.number().min(1).max(500).default(20)
            .describe('Number of results to return (max 500)'),
        offset: z.number().min(0).default(0)
            .describe('Offset for pagination'),
    }),
    execute: async ({ year, season, limit = 20, offset = 0 }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const seasonalAnime = await malService.getSeasonalAnime(year, season, limit, offset);
            if (seasonalAnime.length === 0) {
                return `No anime found for ${season} ${year}.`;
            }
            const formatted = seasonalAnime.map((anime, index) => {
                return `${offset + index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}
   Studios: ${anime.studios?.map(s => s.name).join(', ') || 'N/A'}`;
            }).join('\n\n');
            return `Anime from ${season} ${year} (showing ${seasonalAnime.length} results, offset ${offset}):\n\n${formatted}`;
        } catch (error: any) {
            return `Error fetching seasonal anime: ${error.message}`;
        }
    },
});

const searchCrunchyrollAnime = tool({
    name: 'search_crunchyroll_anime',
    description: 'Search for anime availability on Crunchyroll streaming platform. Use this when users ask if an anime is available on Crunchyroll or want streaming links.',
    parameters: z.object({
        query: z.string().describe('The anime title or search query to look up on Crunchyroll'),
    }),
    execute: async ({ query }) => {
        try {
            if (!process.env.TAVILY_API_KEY) {
                return `Tavily API key is not configured.`;
            }
            const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });
            const response = await tavilyClient.search(query, {
                includeAnswer: true,
                includeDomains: ['crunchyroll.com'],
                maxResults: 5,
            });
            if (!response.results || response.results.length === 0) {
                return `No results found for "${query}" on Crunchyroll.`;
            }
            const formattedResults = response.results.map((result, index) => {
                return `${index + 1}. ${result.title}\n   URL: ${result.url}\n   ${result.content}\n`;
            }).join('\n');
            let output = `Search results for "${query}" on Crunchyroll:\n\n${formattedResults}`;
            if (response.answer) {
                output = `${response.answer}\n\n${output}`;
            }
            return output;
        } catch (error: any) {
            return `Error searching Crunchyroll: ${error.message}`;
        }
    },
});

export const animeAgentTools = [
    // User-specific list tools
    getUserAnimeList,

    // General anime search tools
    searchAnime,
    getAnimeRankings,
    getSeasonalAnime,
    searchCrunchyrollAnime,
];
