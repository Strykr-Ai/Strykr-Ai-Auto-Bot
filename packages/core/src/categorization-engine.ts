import { EnrichedTweet } from './twitter-scraper';
import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

// Financial topic categories with associated keywords
const TOPIC_CATEGORIES = {
  MACROECONOMICS: [
    'inflation', 'cpi', 'ppi', 'gdp', 'recession', 'fed', 'interest rate', 'fomc', 
    'powell', 'treasury', 'yield', 'economy', 'economic', 'unemployment', 'jobs report',
    'nonfarm payroll', 'consumer confidence', 'housing', 'fiscal', 'monetary policy'
  ],
  EARNINGS: [
    'earnings', 'revenue', 'eps', 'profit', 'guidance', 'forecast', 'outlook', 'beats',
    'misses', 'quarterly', 'q1', 'q2', 'q3', 'q4', 'result'
  ],
  TECH_AI: [
    'ai', 'artificial intelligence', 'machine learning', 'ml', 'semiconductor', 'chip',
    'tech', 'technology', 'nvidia', 'nvda', 'meta', 'apple', 'aapl', 'msft', 'microsoft',
    'amzn', 'amazon', 'googl', 'google', 'openai', 'data center', 'cloud'
  ],
  CRYPTO: [
    'crypto', 'bitcoin', 'btc', 'eth', 'ethereum', 'blockchain', 'defi', 'token',
    'coin', 'exchange', 'binance', 'coinbase', 'wallet', 'mining', 'sec', 'regulation',
    'stablecoin', 'nft'
  ],
  REGULATION: [
    'regulation', 'regulator', 'compliance', 'sec', 'cftc', 'finra', 'fdic', 'occ',
    'federal reserve', 'lawsuit', 'legal', 'fine', 'penalty', 'investigation', 'probe',
    'antitrust', 'privacy', 'data protection', 'bill', 'law'
  ]
};

// Topic with score and related tweets
export interface Topic {
  category: keyof typeof TOPIC_CATEGORIES;
  score: number;
  keywords: string[];
  relatedTweets: EnrichedTweet[];
}

export class CategorizationEngine {
  /**
   * Detects dominant financial topics from a collection of tweets
   * @param tweets Collection of tweets to analyze
   * @returns Array of identified topics with scores
   */
  public async categorizeTopics(tweets: EnrichedTweet[]): Promise<Topic[]> {
    if (tweets.length === 0) {
      return [];
    }

    const topicScores: Record<keyof typeof TOPIC_CATEGORIES, {
      score: number;
      keywords: Set<string>;
      tweets: EnrichedTweet[];
    }> = {
      MACROECONOMICS: { score: 0, keywords: new Set(), tweets: [] },
      EARNINGS: { score: 0, keywords: new Set(), tweets: [] },
      TECH_AI: { score: 0, keywords: new Set(), tweets: [] },
      CRYPTO: { score: 0, keywords: new Set(), tweets: [] },
      REGULATION: { score: 0, keywords: new Set(), tweets: [] }
    };

    // Score each tweet against each category
    for (const tweet of tweets) {
      const tweetText = tweet.text.toLowerCase();
      
      for (const [category, keywords] of Object.entries(TOPIC_CATEGORIES)) {
        const categoryKey = category as keyof typeof TOPIC_CATEGORIES;
        
        // Check for keyword matches
        for (const keyword of keywords) {
          if (tweetText.includes(keyword.toLowerCase())) {
            // Increment score based on engagement and keyword
            const engagementScore = 
              (tweet.publicMetrics.retweetCount * 3) + 
              (tweet.publicMetrics.likeCount) + 
              (tweet.publicMetrics.quoteCount * 2);
            
            // Weight more recent tweets higher
            const recencyBoost = Math.max(1, 5 - Math.floor(
              (Date.now() - tweet.createdAt.getTime()) / (1000 * 60 * 15) // 15-minute windows
            ));
            
            topicScores[categoryKey].score += engagementScore * recencyBoost;
            topicScores[categoryKey].keywords.add(keyword);
            
            // Only add the tweet once per category
            if (!topicScores[categoryKey].tweets.includes(tweet)) {
              topicScores[categoryKey].tweets.push(tweet);
            }
            
            break; // Only count each keyword once per tweet
          }
        }
      }
    }

    // Convert to sorted array of topics
    const sortedTopics: Topic[] = Object.entries(topicScores)
      .map(([category, data]) => ({
        category: category as keyof typeof TOPIC_CATEGORIES,
        score: data.score,
        keywords: Array.from(data.keywords),
        relatedTweets: data.tweets
      }))
      .filter(topic => topic.score > 0)
      .sort((a, b) => b.score - a.score);

    // If no keyword-based topics found, use LLM to analyze
    if (sortedTopics.length === 0) {
      return this.fallbackLLMCategorization(tweets);
    }

    return sortedTopics.slice(0, 3); // Return top 3 topics
  }

  /**
   * Fallback to LLM for topic detection when keyword analysis fails
   * @param tweets Collection of tweets to analyze
   * @returns Array of identified topics
   */
  private async fallbackLLMCategorization(tweets: EnrichedTweet[]): Promise<Topic[]> {
    try {
      // Select a sample of tweets (to avoid token limits)
      const sampleTweets = tweets.slice(0, 10);
      const tweetTexts = sampleTweets.map(t => t.text).join('\n\n');
      
      // Use OpenAI API to analyze the tweets
      const prompt = `Analyze these financial tweets and identify the top 1-3 topics being discussed:
      
${tweetTexts}

Return a JSON array with objects containing:
1. category (one of: MACROECONOMICS, EARNINGS, TECH_AI, CRYPTO, REGULATION)
2. score (numeric importance from 1-100)
3. keywords (array of relevant terms)`;

      const response = await axios.post(
        'https://api.openai.com/v1/chat/completions',
        {
          model: 'gpt-4-turbo-preview',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 500
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          }
        }
      );

      // Extract and parse the LLM's JSON response
      const content = response.data.choices[0].message.content;
      const topics: { category: keyof typeof TOPIC_CATEGORIES; score: number; keywords: string[] }[] = 
        JSON.parse(content);
      
      // Attach relevant tweets to each topic
      return topics.map(topic => ({
        ...topic,
        relatedTweets: sampleTweets // Assign all tweets since we don't know exact matches
      }));
    } catch (error) {
      console.error('Error in LLM categorization:', error);
      
      // Return a default topic as fallback
      return [{
        category: 'MACROECONOMICS',
        score: 50,
        keywords: ['market', 'economy'],
        relatedTweets: tweets.slice(0, 3)
      }];
    }
  }
}
