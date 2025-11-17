import { NextResponse } from 'next/server';
import { malService } from '@/app/services/malService';

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const animeId = searchParams.get('id') || '37514'; // Kanata no Astra

        // Get user's full anime list
        const animeList = await malService.getUserAnimeList('@me', undefined, 1000, 0);
        
        // Find the specific anime
        const foundAnime = animeList.find(item => item.node.id === parseInt(animeId));

        if (foundAnime) {
            return NextResponse.json({
                found: true,
                anime: foundAnime.node.title,
                status: foundAnime.list_status.status,
                score: foundAnime.list_status.score,
                episodes_watched: foundAnime.list_status.num_episodes_watched,
                updated_at: foundAnime.list_status.updated_at,
                message: `✅ Anime IS in your list!`
            });
        } else {
            return NextResponse.json({
                found: false,
                animeId,
                totalAnimeInList: animeList.length,
                message: `❌ Anime NOT found in your list. You have ${animeList.length} anime total.`,
                hint: 'The update API returned success, but the anime is not showing in your list. This might be a caching issue on MAL\'s side.'
            });
        }
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
