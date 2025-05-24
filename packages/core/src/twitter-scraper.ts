import { TwitterApi } from 'twitter-api-v2';
import { TweetV2, UserV2, PublicMetricsV2 } from 'twitter-api-v2';
import * as dotenv from 'dotenv';

dotenv.config();

// Define the financial accounts to monitor
const FINANCIAL_ACCOUNTS = [
  'zerohedge',
  'WSJMarkets',
  'business',
  'markets',
  'Stocktwits',
  'CNBCnow',
  'CNBC',
  'MarketWatch',
  'YahooFinance',
  'TheStreet'
];

// Tweet with engagement metrics
export interface EnrichedTweet extends TweetV2 {
  authorUsername: string;
  publicMetrics: {
    retweetCount: number;
    replyCount: number;
    likeCount: number;
    quoteCount: number;
  };
  createdAt: Date;
  // Ensure text property is explicitly defined for TweetV2
  text: string;
}

export class TwitterScraper {
  private client: TwitterApi;
  private lastFetchTime: Date;

  constructor() {
    // Initialize Twitter client with API credentials
    this.client = new TwitterApi({
      appKey: process.env.TWITTER_API_KEY!,
      appSecret: process.env.TWITTER_API_KEY_SECRET!,
      accessToken: process.env.TWITTER_ACCESS_TOKEN!,
      accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET!,
      bearerToken: process.env.TWITTER_BEARER_TOKEN
    });

    this.lastFetchTime = new Date();
    this.lastFetchTime.setHours(this.lastFetchTime.getHours() - 1); // Start by looking at the last hour
  }

  /**
   * Fetch recent tweets from financial accounts
   * @returns Array of enriched tweets with engagement metrics
   */
  public async fetchRecentFinancialTweets(): Promise<EnrichedTweet[]> {
    try {
      // Build the query to fetch tweets from monitored accounts
      const query = FINANCIAL_ACCOUNTS.map(account => `from:${account}`).join(' OR ');
      
      const now = new Date();
      
      // Fetch tweets with Twitter API v2
      const response = await this.client.v2.search(query, {
        'tweet.fields': 'created_at,public_metrics',
        'user.fields': 'username',
        'expansions': 'author_id',
        'start_time': this.lastFetchTime.toISOString(),
        'end_time': now.toISOString(),
        'max_results': 100
      });

      // Update lastFetchTime for next call
      this.lastFetchTime = now;
      
      // Process tweets and include author username
      const users = response.includes?.users || [];
      const userMap = new Map<string, UserV2>();
      
      for (const user of users) {
        userMap.set(user.id, user);
      }
      
      // Enrich tweets with author info and other fields
      const enrichedTweets: EnrichedTweet[] = [];
      
      // Process each tweet in the response data array
      // Ensure we're accessing the data array properly
      for (const tweet of Array.isArray(response.data) ? response.data : []) {
        const author = userMap.get(tweet.author_id as string);
        
        enrichedTweets.push({
          ...tweet,
          authorUsername: author?.username || 'unknown',
          publicMetrics: tweet.public_metrics || {
            retweetCount: 0,
            replyCount: 0,
            likeCount: 0,
            quoteCount: 0
          },
          createdAt: new Date(tweet.created_at as string)
        });
      }
      
      // Filter tweets - prioritize ones with high engagement or breaking news indicators
      return enrichedTweets
        .filter(tweet => {
          const hasHighEngagement = 
            (tweet.publicMetrics.retweetCount > 10) || 
            (tweet.publicMetrics.likeCount > 20);
          
          const hasBreakingIndicator = 
            tweet.text.toUpperCase().includes('BREAKING') || 
            tweet.text.includes('JUST IN') || 
            tweet.text.includes('ALERT');
          
          return hasHighEngagement || hasBreakingIndicator;
        })
        .sort((a, b) => {
          // Sort by engagement score (retweets count more)
          const scoreA = a.publicMetrics.retweetCount * 2 + a.publicMetrics.likeCount;
          const scoreB = b.publicMetrics.retweetCount * 2 + b.publicMetrics.likeCount;
          return scoreB - scoreA;
        });
    } catch (error) {
      console.error('Error fetching financial tweets:', error);
      return [];
    }
  }
}
