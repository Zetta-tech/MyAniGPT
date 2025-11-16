# Anime Recommendation AI Chatbot

An intelligent anime recommendation chatbot powered by OpenAI Agents, MyAnimeList API, and web search capabilities. Get personalized anime recommendations based on your watch history and preferences!

## Features

### 🤖 AI-Powered Recommendations
- Personalized anime suggestions based on your MyAnimeList watch history
- Intelligent conversation with session memory
- Context-aware recommendations that improve over time

### 📊 MyAnimeList Integration
- **View Your Anime List**: See what you've watched, are watching, or plan to watch
- **Search Anime**: Find detailed information about any anime from MAL database
- **Top Rankings**: Discover top-rated, most popular, or currently airing anime
- **Seasonal Anime**: Explore anime from specific seasons and years
- **Smart Analysis**: AI analyzes your ratings and preferences to make better recommendations

### 🌐 Streaming Availability
- **Crunchyroll Search**: Check if anime is available on Crunchyroll
- Get direct links to watch your recommended anime

### 💬 Session Management
- Maintains conversation context throughout your chat session
- Remembers your preferences and previous recommendations
- Reset button to start fresh conversations

## Getting Started

### Prerequisites

- Node.js 18+ installed
- MyAnimeList account with some anime in your list
- OpenAI API key
- Tavily API key (for web search)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <your-repo-name>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.local.example .env.local
```

4. Edit `.env.local` and add your API keys:
```env
OPENAI_API_KEY=your_openai_api_key
TAVILY_API_KEY=your_tavily_api_key
MAL_CLIENT_ID=your_mal_client_id
MAL_CLIENT_SECRET=your_mal_client_secret
```

### Getting API Keys

#### OpenAI API Key
1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Sign up or log in
3. Navigate to API Keys section
4. Create a new API key

#### Tavily API Key
1. Go to [Tavily](https://tavily.com/)
2. Sign up for a free account
3. Get your API key from the dashboard

#### MyAnimeList API Credentials
1. Go to [MAL API Config](https://myanimelist.net/apiconfig)
2. Create a new API application
3. Get your Client ID and Client Secret
4. See [MAL_SETUP.md](./MAL_SETUP.md) for detailed instructions

### Setting Up MAL Access Token

After getting your MAL credentials, you need to obtain an access token:

**Option 1: Using the setup script**
```bash
node scripts/setup-mal-token.js
```

**Option 2: Manual setup**
```bash
# Get access token
curl -X POST https://myanimelist.net/v1/oauth2/token \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "grant_type=client_credentials"

# Set token in your app (make sure app is running)
curl -X POST http://localhost:3000/api/mal/auth \
  -H "Content-Type: application/json" \
  -d '{"accessToken": "YOUR_ACCESS_TOKEN", "expiresIn": 2592000}'
```

See [MAL_SETUP.md](./MAL_SETUP.md) for complete setup instructions.

### Running the Application

1. Start the development server:
```bash
npm run dev
```

2. Open [http://localhost:3000/chat](http://localhost:3000/chat) in your browser

3. Start chatting with the AI anime assistant!

## Usage Examples

Try these prompts with the chatbot:

- "Show me my watched anime"
- "What anime am I currently watching?"
- "Recommend me some anime based on my list"
- "I like action and fantasy anime, what should I watch?"
- "What are the top-rated anime right now?"
- "What anime is airing this season?"
- "Search for Attack on Titan"
- "Is Demon Slayer available on Crunchyroll?"

## How It Works

### Architecture

1. **Frontend**: Next.js 16 with React 19, streaming UI updates
2. **AI Agent**: OpenAI Agents SDK with custom tools
3. **Session Management**: Custom memory session that persists conversation context
4. **Tools**:
   - `get_user_watched_anime`: Fetches user's MAL anime list
   - `search_mal_anime`: Searches MyAnimeList database
   - `get_anime_rankings`: Gets top-ranked anime
   - `get_seasonal_anime`: Gets seasonal anime
   - `search_crunchyroll_anime`: Checks Crunchyroll availability

### Recommendation Flow

1. User asks for recommendations
2. AI agent checks user's MAL watch history
3. Analyzes preferences (genres, ratings, watch patterns)
4. Uses MAL API to find similar or highly-rated anime
5. Checks streaming availability on Crunchyroll
6. Provides personalized recommendations with explanations

### Session Memory

- Each chat session maintains context until reset
- AI remembers previous recommendations and user preferences
- Click "Reset" button to start a new session

## Project Structure

```
src/
├── app/
│   ├── ai/
│   │   ├── animeAgent.ts          # Main AI agent
│   │   ├── animeAgentPrompt.ts    # System prompt
│   │   ├── animeAgentTools.ts     # Tool definitions
│   │   └── sessionManager.ts      # Session management
│   ├── api/
│   │   ├── chat/stream/route.ts   # Streaming chat API
│   │   └── mal/auth/route.ts      # MAL token management
│   ├── services/
│   │   ├── chatbotService.ts      # Chatbot service
│   │   └── malService.ts          # MAL API service
│   └── chat/page.tsx              # Chat UI
scripts/
└── setup-mal-token.js             # MAL token setup script
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `OPENAI_API_KEY` | OpenAI API key | Yes |
| `TAVILY_API_KEY` | Tavily API key for web search | Yes |
| `MAL_CLIENT_ID` | MyAnimeList Client ID | Yes |
| `MAL_CLIENT_SECRET` | MyAnimeList Client Secret | Yes |

## Troubleshooting

### "MAL API credentials not configured"
- Ensure `MAL_CLIENT_ID` and `MAL_CLIENT_SECRET` are in `.env.local`
- Restart the development server

### "No valid access token"
- Run the token setup script: `node scripts/setup-mal-token.js`
- Or manually set the token via the API endpoint

### "API error 401"
- Your access token has expired (tokens last 30 days)
- Get a new token using the setup script

See [MAL_SETUP.md](./MAL_SETUP.md) for more troubleshooting tips.

## Technologies Used

- **Next.js 16**: React framework with App Router
- **React 19**: UI library
- **OpenAI Agents SDK**: AI agent framework
- **MyAnimeList API**: Anime data and user lists
- **Tavily**: Web search for streaming availability
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Styling

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is open source and available under the MIT License.

## Acknowledgments

- [MyAnimeList](https://myanimelist.net/) for the anime database API
- [OpenAI](https://openai.com/) for the AI capabilities
- [Tavily](https://tavily.com/) for web search functionality
