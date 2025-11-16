import { tool } from '@openai/agents';
import { z } from 'zod';
import { tavily } from '@tavily/core';
import { malService } from '../services/malService';

const getUserAnimeList = tool({
    name: 'get_user_anime_list',
    description: 'Get the user\'s anime list from MyAnimeList. Use this to see what anime the user has watched, is watching, or plans to watch to provide personalized recommendations.',
    parameters: z.object({}),
    execute: async () => {
        const username = 'Zettaheisinium';
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const animeList = await malService.getUserAnimeList(username, undefined, 50);
            if (animeList.length === 0) {
                return `User has no anime in their list or the list is private.`;
            }
            const formatted = animeList.map((item, index) => {
                const anime = item.node;
                const listStatus = item.list_status;
                return `${index + 1}. ${anime.title} (${anime.media_type || 'TV'})
   Status: ${listStatus.status} | Episodes: ${listStatus.num_episodes_watched}/${anime.num_episodes || '?'}
   User Score: ${listStatus.score || 'Not rated'} | MAL Score: ${anime.mean || 'N/A'}
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}`;
            }).join('\n\n');
            return `Anime List (${animeList.length} items):\n\n${formatted}`;
        } catch (error: any) {
            return `Error fetching anime list: ${error.message}`;
        }
    },
});

const searchMALAnime = tool({
    name: 'search_mal_anime',
    description: 'Search for anime on MyAnimeList database. Use this to find anime details, ratings, and information from MAL.',
    parameters: z.object({
        query: z.string().describe('The anime title or search query'),
    }),
    execute: async ({ query }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const results = await malService.searchAnime(query, 10);
            if (results.length === 0) {
                return `No anime found for "${query}" on MyAnimeList.`;
            }
            const formatted = results.map((anime, index) => {
                return `${index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10 | Rank: #${anime.rank || 'N/A'}
   Status: ${anime.status || 'Unknown'}
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}
   Synopsis: ${anime.synopsis?.substring(0, 150) || 'No synopsis available'}...`;
            }).join('\n\n');
            return `Search results for "${query}" on MyAnimeList:\n\n${formatted}`;
        } catch (error: any) {
            return `Error searching anime on MAL: ${error.message}`;
        }
    },
});

const getAnimeRankings = tool({
    name: 'get_anime_rankings',
    description: 'Get top-ranked anime from MyAnimeList. Use this to recommend popular or highly-rated anime.',
    parameters: z.object({
        rankingType: z.enum(['all', 'airing', 'upcoming', 'tv', 'ova', 'movie', 'special', 'bypopularity', 'favorite'])
            .describe('Type of ranking: all (top rated), airing (currently airing), upcoming, tv, movie, bypopularity, etc.'),
    }),
    execute: async ({ rankingType }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const rankings = await malService.getAnimeRanking(rankingType, 20);
            if (rankings.length === 0) {
                return `No rankings found for type "${rankingType}".`;
            }
            const formatted = rankings.map((anime, index) => {
                return `${index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10 | Rank: #${anime.rank || 'N/A'}
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}`;
            }).join('\n\n');
            return `Top ${rankingType} anime on MyAnimeList:\n\n${formatted}`;
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
    }),
    execute: async ({ year, season }) => {
        try {
            if (!malService.isConfigured()) {
                return 'MyAnimeList API is not configured.';
            }
            const seasonalAnime = await malService.getSeasonalAnime(year, season, 20);
            if (seasonalAnime.length === 0) {
                return `No anime found for ${season} ${year}.`;
            }
            const formatted = seasonalAnime.map((anime, index) => {
                return `${index + 1}. ${anime.title}
   Type: ${anime.media_type || 'TV'} | Episodes: ${anime.num_episodes || 'Unknown'}
   Score: ${anime.mean || 'N/A'}/10
   Genres: ${anime.genres?.map(g => g.name).join(', ') || 'N/A'}
   Studios: ${anime.studios?.map(s => s.name).join(', ') || 'N/A'}`;
            }).join('\n\n');
            return `Anime from ${season} ${year}:\n\n${formatted}`;
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
    getUserAnimeList,
    searchMALAnime,
    getAnimeRankings,
    getSeasonalAnime,
    searchCrunchyrollAnime,
];
