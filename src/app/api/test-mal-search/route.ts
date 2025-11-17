import { NextResponse } from 'next/server';
import { malService } from '@/app/services/malService';

export async function GET() {
    try {
        const results = await malService.searchAnime('Kanata no Astra', 5, 0);
        
        return NextResponse.json({
            query: 'Kanata no Astra',
            results: results.map(anime => ({
                id: anime.id,
                title: anime.title,
                type: anime.media_type,
                episodes: anime.num_episodes,
                score: anime.mean,
            }))
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
