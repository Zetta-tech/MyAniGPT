import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const accessToken = process.env.MAL_ACCESS_TOKEN;
        
        if (!accessToken) {
            return NextResponse.json({ error: 'No access token' }, { status: 401 });
        }

        // Get current user info
        const response = await fetch('https://api.myanimelist.net/v2/users/@me', {
            headers: {
                'Authorization': `Bearer ${accessToken}`
            }
        });

        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error, status: response.status }, { status: response.status });
        }

        const user = await response.json();

        return NextResponse.json({
            username: user.name,
            id: user.id,
            picture: user.picture,
            message: `Token is for user: ${user.name} (ID: ${user.id})`
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
