import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET(request: NextRequest) {
    // Generate code verifier for PKCE (MAL uses plain method, not S256)
    const codeVerifier = crypto.randomBytes(64).toString('base64url').substring(0, 128);
    const codeChallenge = codeVerifier; // MAL uses plain method

    const redirectUri = request.nextUrl.origin; // Just http://localhost:3000

    // Encode the code_verifier in the state parameter so we can retrieve it later
    const state = Buffer.from(JSON.stringify({
        verifier: codeVerifier,
        random: crypto.randomBytes(8).toString('hex')
    })).toString('base64url');

    return NextResponse.redirect(
        `https://myanimelist.net/v1/oauth2/authorize?` +
        `response_type=code&` +
        `client_id=${process.env.MAL_CLIENT_ID}&` +
        `code_challenge=${codeChallenge}&` +
        `code_challenge_method=plain&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `state=${state}`
    );
}
