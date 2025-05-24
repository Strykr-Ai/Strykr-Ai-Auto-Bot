import { Topic } from './categorization-engine';
import { EnrichedTweet } from './twitter-scraper';

/**
 * Type definition for query templates based on financial categories
 */
interface QueryTemplates {
  [key: string]: string[];
}

/**
 * Result of query generation
 */
export interface QueryResult {
  query: string;
  topic: Topic;
  sourceText: string;
  timestamp: Date;
}

/**
 * Responsible for building contextually relevant queries for the Strykr.ai API
 * based on detected financial topics and tweets
 */
export class QueryBuilder {
  private readonly templates: QueryTemplates = {
    MACROECONOMICS: [
      "What does Strykr.ai think about the recent {keyword} data and its impact on markets?",
      "How might today's news about {keyword} affect market sentiment in the next 24-48 hours?",
      "How does Strykr.ai assess the recent market reaction to {keyword} developments?",
      "Given the latest {keyword} news, what sectors might outperform or underperform in the short term?",
      "How should investors interpret today's {keyword} news in the context of the broader economic cycle?"
    ],
    EARNINGS: [
      "What does Strykr.ai think about {company}'s recent earnings report and its implications?",
      "How might {company}'s earnings results impact its sector and related stocks?",
      "What's Strykr.ai's take on {company}'s guidance and forward outlook?",
      "Given {company}'s recent performance, how might their competitive position change?",
      "What key metrics from {company}'s earnings should investors focus on most?"
    ],
    TECH_AI: [
      "What does Strykr.ai predict for {keyword} policy developments in the coming weeks?",
      "How might the news about {keyword} impact the broader tech ecosystem?",
      "What are the investment implications of today's {keyword} announcements?",
      "How does Strykr.ai interpret the market's reaction to recent {keyword} news?",
      "What second-order effects might emerge from these {keyword} developments?"
    ],
    CRYPTO: [
      "What's Strykr.ai's take on the recent movements in {keyword} prices?",
      "How might today's {keyword} news impact the broader digital asset ecosystem?",
      "What factors are driving the current {keyword} market conditions?",
      "How should investors interpret the recent {keyword} developments?",
      "What might be the regulatory implications of recent {keyword} events?"
    ],
    REGULATION: [
      "How might the new {keyword} regulations impact financial markets?",
      "What's Strykr.ai's analysis of the potential consequences of these {keyword} regulatory changes?",
      "How should investors position themselves in light of these {keyword} regulatory developments?",
      "What sectors or companies might be most affected by these {keyword} regulatory changes?",
      "What precedent do these {keyword} regulatory actions set for future market governance?"
    ]
  };

  /**
   * Builds a contextually relevant query for the Strykr.ai API
   * @param topic The financial topic to build a query for
   * @returns A structured query result with context
   */
  public buildQuery(topic: Topic): QueryResult {
    // Choose the most relevant tweet for context
    const contextTweet = this.selectMostRelevantTweet(topic.relatedTweets);
    
    // Select the most prominent keyword
    const primaryKeyword = topic.keywords[0] || 'market trends';
    
    // Get template set for the topic category
    const templateSet = this.templates[topic.category] || this.templates.MACROECONOMICS;
    
    // Randomly select a template
    const templateIndex = Math.floor(Math.random() * templateSet.length);
    const template = templateSet[templateIndex];
    
    // Detect if we're dealing with a company or general keyword
    const isCompany = this.detectCompanyName(topic.keywords, contextTweet.text);
    
    // Fill in the template
    let query = template;
    if (template.includes('{company}') && isCompany) {
      query = template.replace('{company}', isCompany);
    } else {
      query = template.replace('{keyword}', primaryKeyword);
    }
    
    return {
      query,
      topic,
      sourceText: contextTweet.text,
      timestamp: new Date()
    };
  }
  
  /**
   * Selects the most relevant tweet from a collection based on engagement and keyword relevance
   * @param tweets Collection of tweets to analyze
   * @returns The most relevant tweet for context
   */
  private selectMostRelevantTweet(tweets: EnrichedTweet[]): EnrichedTweet {
    if (tweets.length === 0) {
      throw new Error('No tweets provided to select from');
    }
    
    // Sort by engagement score and recency
    return tweets.sort((a, b) => {
      const scoreA = (a.publicMetrics.retweetCount * 2) + 
                     a.publicMetrics.likeCount + 
                     (a.publicMetrics.quoteCount * 1.5);
                     
      const scoreB = (b.publicMetrics.retweetCount * 2) + 
                     b.publicMetrics.likeCount + 
                     (b.publicMetrics.quoteCount * 1.5);
      
      // Factor in recency (newer is better)
      const recencyDiff = b.createdAt.getTime() - a.createdAt.getTime();
      const recencyFactor = recencyDiff / (1000 * 60 * 30); // 30 min window
      
      return (scoreB - scoreA) + (recencyFactor * 10);
    })[0];
  }
  
  /**
   * Attempts to detect a company name in the keywords or tweet text
   * @param keywords List of keywords associated with the topic
   * @param tweetText The tweet text to analyze
   * @returns Company name if detected, otherwise false
   */
  private detectCompanyName(keywords: string[], tweetText: string): string | false {
    // Common stock tickers and company names
    const companyPatterns = [
      { pattern: /\$([A-Z]{1,5})\b/, group: 1 },  // $AAPL, $MSFT, etc.
      { pattern: /\b(AAPL|MSFT|GOOGL|GOOG|AMZN|META|NVDA|TSLA|AMD|INTC)\b/, group: 1 },
      { pattern: /\b(Apple|Microsoft|Google|Amazon|Meta|Nvidia|Tesla|AMD|Intel)\b/i, group: 1 }
    ];
    
    // Check keywords first
    for (const keyword of keywords) {
      for (const { pattern, group } of companyPatterns) {
        const match = keyword.match(pattern);
        if (match && match[group]) {
          return match[group];
        }
      }
    }
    
    // Then check the tweet text
    for (const { pattern, group } of companyPatterns) {
      const match = tweetText.match(pattern);
      if (match && match[group]) {
        return match[group];
      }
    }
    
    return false;
  }
}
