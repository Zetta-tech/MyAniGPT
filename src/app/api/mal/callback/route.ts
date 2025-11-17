import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
        return NextResponse.json(
            { error: 'Missing code or state parameter' },
            { status: 400 }
        );
    }

    // Decode the state to get the code_verifier
    let codeVerifier: string;
    try {
        const stateData = JSON.parse(Buffer.from(state, 'base64url').toString());
        codeVerifier = stateData.verifier;
    } catch (error) {
        return NextResponse.json(
            { error: 'Invalid state parameter' },
            { status: 400 }
        );
    }

    try {
        const redirectUri = request.nextUrl.origin; // Just http://localhost:3000

        // Exchange authorization code for access token
        const tokenResponse = await fetch('https://myanimelist.net/v1/oauth2/token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                client_id: process.env.MAL_CLIENT_ID!,
                client_secret: process.env.MAL_CLIENT_SECRET!,
                code: code,
                code_verifier: codeVerifier,
                grant_type: 'authorization_code',
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const errorText = await tokenResponse.text();
            console.error('MAL token exchange error:', errorText);
            return NextResponse.json(
                { error: 'Failed to exchange code for token', details: errorText },
                { status: tokenResponse.status }
            );
        }

        const tokenData = await tokenResponse.json();

        // Display the tokens to the user
        return new NextResponse(
            `
            <!DOCTYPE html>
            <html>
            <head>
                <title>MAL OAuth Success</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        max-width: 800px;
                        margin: 50px auto;
                        padding: 20px;
                        background: #f5f5f5;
                    }
                    .container {
                        background: white;
                        padding: 30px;
                        border-radius: 8px;
                        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                    }
                    h1 { color: #2e51a2; }
                    .token-box {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 4px;
                        margin: 15px 0;
                        word-break: break-all;
                        font-family: monospace;
                        font-size: 12px;
                    }
                    .label {
                        font-weight: bold;
                        color: #555;
                        margin-bottom: 5px;
                    }
                    .success {
                        color: #28a745;
                        font-weight: bold;
                    }
                    .instructions {
                        background: #fff3cd;
                        padding: 15px;
                        border-radius: 4px;
                        margin-top: 20px;
                        border-left: 4px solid #ffc107;
                    }
                    button {
                        background: #2e51a2;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 4px;
                        cursor: pointer;
                        margin-top: 10px;
                    }
                    button:hover {
                        background: #1e3a7a;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <h1>✅ MAL OAuth Successful!</h1>
                    <p class="success">Your MyAnimeList account has been authorized.</p>
                    
                    <div class="label">Access Token:</div>
                    <div class="token-box" id="accessToken">${tokenData.access_token}</div>
                    <button onclick="copyToken('accessToken')">Copy Access Token</button>
                    
                    <div class="label" style="margin-top: 20px;">Refresh Token:</div>
                    <div class="token-box" id="refreshToken">${tokenData.refresh_token}</div>
                    <button onclick="copyToken('refreshToken')">Copy Refresh Token</button>
                    
                    <div class="label" style="margin-top: 20px;">Expires In:</div>
                    <div class="token-box">${tokenData.expires_in} seconds (${Math.floor(tokenData.expires_in / 86400)} days)</div>
                    
                    <div class="instructions">
                        <strong>📝 Instructions:</strong>
                        <ol>
                            <li>Copy the <strong>Access Token</strong> above</li>
                            <li>Open your <code>.env.local</code> file</li>
                            <li>Replace the value of <code>MAL_ACCESS_TOKEN</code> with the new token</li>
                            <li>Save the file and restart your development server</li>
                        </ol>
                        <p><strong>Note:</strong> Save the refresh token too - you'll need it when the access token expires in ${Math.floor(tokenData.expires_in / 86400)} days.</p>
                    </div>
                </div>
                
                <script>
                    function copyToken(elementId) {
                        const element = document.getElementById(elementId);
                        const text = element.textContent;
                        navigator.clipboard.writeText(text).then(() => {
                            alert('Token copied to clipboard!');
                        });
                    }
                </script>
            </body>
            </html>
            `,
            {
                status: 200,
                headers: {
                    'Content-Type': 'text/html',
                },
            }
        );
    } catch (error: any) {
        console.error('MAL OAuth error:', error);
        return NextResponse.json(
            { error: 'OAuth failed', details: error.message },
            { status: 500 }
        );
    }
}
