import { NextResponse } from 'next/server';
import { malService } from '@/app/services/malService';

export async function GET() {
    try {
        console.log('=== Testing MAL Update ===');
        console.log('Has access token:', malService.hasAccessToken());
        
        // Test with Kanata no Astra (ID: 39587)
        const animeId = 39587;
        const status = 'completed';
        const score = 10;
        const numWatchedEpisodes = 12;
        const comments = 'Test comment from API';

        console.log('Attempting to update anime:', { animeId, status, score, numWatchedEpisodes, comments });

        const result = await malService.updateAnimeListStatus(
            animeId,
            status,
            score,
            numWatchedEpisodes,
            comments
        );

        console.log('Update successful!', result);

        return NextResponse.json({
            success: true,
            result,
        });
    } catch (error: any) {
        console.error('Update failed:', error);
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.toString(),
        }, { status: 500 });
    }
}
