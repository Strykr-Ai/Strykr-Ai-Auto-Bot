# 🚀 Strykr.ai Auto Bot

A real-time financial monitoring system that tracks trending financial discussions, queries the Strykr.ai API for insights, and automatically posts updates to Telegram and Twitter.

![Architecture Overview](https://via.placeholder.com/800x400?text=Strykr.ai+Architecture)

## 📋 Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Component Details](#component-details)
- [Setup Instructions](#setup-instructions)
- [Configuration](#configuration)
- [Development](#development)
- [Deployment](#deployment)
- [Implementation Roadmap](#implementation-roadmap)
- [Troubleshooting](#troubleshooting)

## 🔍 Overview

**Strykr.ai Auto Bot** is an automated system that monitors top financial Twitter accounts, detects trending discussions, categorizes financial themes, and then:

1. Generates smart queries for Strykr.ai's API based on trending financial news
2. Processes and summarizes the AI's output
3. Posts the insights to Telegram and Twitter as "Breaking News" style updates

The system runs on an hourly schedule, keeping your audience updated with the latest AI-powered financial insights.

## 🏗️ System Architecture

The application follows a modular architecture with a clear data flow:

```
[TWITTER SCRAPER (API v2)] → [RECENT POSTS CACHE]
            ↓
[CATEGORIZATION ENGINE] → [QUERY BUILDER]
            ↓
[STRYKR.AI API REQUEST] → [SUMMARY + FORMATTING]
            ↓
[TELEGRAM + TWITTER POST]
```

### Data Flow Overview

1. **Twitter Scraping**: Every hour, the system pulls recent tweets from key financial accounts
2. **Topic Extraction**: NLP processing identifies trending financial themes
3. **Query Generation**: Contextual queries are generated for the Strykr.ai API
4. **Insight Retrieval**: The system fetches expert financial insights from Strykr.ai
5. **Content Preparation**: The insights are formatted for optimal presentation on each platform
6. **Publishing**: Automated posts are created on both Telegram and Twitter

## 🧩 Component Details

### Core Package

The main functionality is contained in the `packages/core` directory:

#### TwitterScraper (`twitter-scraper.ts`)

- Connects to Twitter API v2 using application credentials
- Fetches tweets from predefined list of financial accounts
- Filters for high-engagement content and breaking news indicators
- Enriches tweets with engagement metrics and metadata

```typescript
public async fetchRecentFinancialTweets(): Promise<EnrichedTweet[]>
```

#### CategorizationEngine (`categorization-engine.ts`)

- Processes tweets to identify recurring financial themes and topics
- Performs keyword-based topic classification across financial domains
- Falls back to LLM categorization when keyword matching is insufficient
- Returns topics ranked by relevance and engagement

```typescript
public async categorizeTopics(tweets: EnrichedTweet[]): Promise<Topic[]>
```

#### QueryBuilder (`query-builder.ts`)

- Constructs contextually relevant queries for the Strykr.ai API
- Uses templates based on the financial category (Macroeconomics, Earnings, etc.)
- Selects the most appropriate template and fills in relevant keywords
- Ensures queries are focused on current financial trends

```typescript
public buildQuery(topic: Topic): QueryResult
```

#### StrykrApiClient (`strykr-api-client.ts`)

- Handles communication with the Strykr.ai API
- Sends financial queries and receives AI-generated insights
- Manages authentication, error handling, and response processing
- Includes connection testing and fallback mechanisms

```typescript
public async getInsight(query: string): Promise<StrykrResponse>
```

#### ContentFormatter (`content-formatter.ts`)

- Formats Strykr.ai insights for social media platforms
- Creates platform-specific content with appropriate formatting
- Generates attention-grabbing headlines from the source content
- Adds relevant hashtags and category-specific emojis

```typescript
public formatContent(queryResult: QueryResult, strykrResponse: StrykrResponse): FormattedContent
```

#### MainOrchestrator (`main-orchestrator.ts`)

- Coordinates all components and manages the overall process flow
- Runs on a configurable schedule (default: hourly)
- Maintains a cache to prevent duplicate posts on the same topic
- Provides error handling and logging throughout the process

```typescript
public async runFullProcess(): Promise<{ success: boolean; message: string }>
```

### Platform-Specific Packages

#### Twitter Bot (`packages/twitter-bot`)

- Posts financial insights to Twitter
- Handles Twitter API authentication and rate limiting
- Maintains state to avoid duplicate posts

#### Telegram Bot (`packages/telegram-bot`)

- Posts financial insights to Telegram channels or groups
- Formats messages with rich Telegram markdown
- Handles user interaction and command processing

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm 10+
- Twitter Developer Account with API v2 access
- Telegram Bot Token (obtained from @BotFather)
- Strykr.ai API credentials

### Installation

1. Clone the repository:
```bash
git clone https://github.com/your-org/strykr-ai-auto-bot.git
cd strykr-ai-auto-bot
```

2. Install dependencies:
```bash
npm install
```

3. Create environment configuration:
```bash
cp .env.example .env
```

4. Update the `.env` file with your API credentials (see Configuration section)

5. Build the project:
```bash
npm run build
```

## ⚙️ Configuration

Configure the system by setting these environment variables in the `.env` file:

### API Credentials

```
# Strykr.ai API credentials
STRYKR_API_URL=https://api.strykr.ai/v1
STRYKR_API_KEY=your_strykr_api_key_here

# Twitter / X API credentials
TWITTER_API_KEY=your_twitter_api_key_here
TWITTER_API_KEY_SECRET=your_twitter_api_key_secret_here
TWITTER_BEARER_TOKEN=your_twitter_bearer_token_here
TWITTER_ACCESS_TOKEN=your_twitter_access_token_here
TWITTER_ACCESS_TOKEN_SECRET=your_twitter_access_token_secret_here

# Telegram Bot credentials
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here
TELEGRAM_CHANNEL_ID=your_telegram_channel_id_here
```

### Optional Settings

```
# Schedule configuration (cron syntax)
MONITORING_SCHEDULE="0 * * * *"  # Default: run every hour

# Topic filtering options
MIN_ENGAGEMENT_SCORE=50  # Minimum engagement score for topics
MAX_TOPICS_PER_RUN=1     # Maximum topics to process per run

# Twitter accounts to monitor (comma-separated)
FINANCIAL_ACCOUNTS=zerohedge,WSJMarkets,business,markets,Stocktwits
```

## 💻 Development

### Project Structure

```
strykr-ai-auto-bot/
├── data/
│   └── cache/          # Cache for processed topics
├── packages/
│   ├── core/           # Core functionality
│   │   └── src/        # Core TypeScript source files
│   ├── telegram-bot/   # Telegram bot implementation
│   │   └── src/        # Telegram bot source files
│   └── twitter-bot/    # Twitter bot implementation
│       └── src/        # Twitter bot source files
├── .env.example        # Example environment configuration
├── package.json        # Project dependencies and scripts
├── tsconfig.base.json  # Base TypeScript configuration
└── turbo.json          # Turborepo configuration
```

### Running Locally

Development mode with hot-reloading:
```bash
npm run dev
```

Build for production:
```bash
npm run build
```

Run the production build:
```bash
npm run start
```

Run linting:
```bash
npm run lint
```

## 🚀 Deployment

### Production Deployment

1. Build the production version:
```bash
npm run build
```

2. Start the application:
```bash
node packages/core/dist/index.js
```

### Docker Deployment

A Dockerfile is provided for containerized deployment:

```bash
docker build -t strykr-ai-auto-bot .
docker run -d --env-file .env strykr-ai-auto-bot
```

### Cloud Deployment

The bot can be deployed to various cloud platforms:

- **AWS Lambda**: Use the serverless framework with scheduled triggers
- **Heroku**: Deploy as a worker process using the Procfile
- **Digital Ocean**: Run as a Docker container on a droplet

## 📝 Implementation Roadmap

### Phase 1: Core Functionality
- [x] Set up project structure
- [x] Implement Twitter scraper
- [x] Build categorization engine
- [x] Create query builder
- [x] Develop Strykr.ai API client
- [x] Implement content formatter
- [x] Create main orchestrator

### Phase 2: Platform Integration
- [ ] Update Twitter bot implementation
- [ ] Update Telegram bot implementation
- [ ] Add cross-posting capabilities
- [ ] Implement caching mechanism

### Phase 3: Advanced Features
- [ ] Add sentiment analysis for tweets
- [ ] Implement advanced NLP for topic extraction
- [ ] Create engagement analytics dashboard
- [ ] Add support for more social platforms
- [ ] Implement A/B testing for post formats

### Phase 4: Optimization & Scale
- [ ] Optimize API usage and rate limiting
- [ ] Implement robust error handling and recovery
- [ ] Add performance monitoring and logging
- [ ] Create admin dashboard for system monitoring
- [ ] Scale to handle larger volumes of data

## 🔧 Troubleshooting

### Common Issues

#### Twitter API Rate Limiting
The Twitter API has rate limits that may affect the functionality. If you encounter rate limiting issues:
- Reduce the frequency of API calls
- Implement exponential backoff for retries
- Consider using a higher tier Twitter API access

#### Strykr.ai API Connection Issues
If you encounter issues connecting to the Strykr.ai API:
- Verify your API key and endpoint URL
- Check network connectivity
- Inspect response headers for error details

#### Duplicate Posts
If you notice duplicate posts on social media:
- Check the caching mechanism
- Verify that topic hashing is working correctly
- Inspect the deduplication logic in the orchestrator

### Logs and Monitoring

The system logs information to help with troubleshooting:
- Check console output for error messages
- Review the cached topic files in `data/cache/`
- Enable detailed logging by setting `DEBUG=true` in the environment

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ by the Strykr.ai team
