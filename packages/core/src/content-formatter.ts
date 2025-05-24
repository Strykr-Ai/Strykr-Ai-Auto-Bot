import { QueryResult } from './query-builder';
import { StrykrResponse } from './strykr-api-client.js';
import { Topic } from './categorization-engine';

/**
 * Formatted content for social media posts
 */
export interface FormattedContent {
  telegram: string;
  twitter: string;
  topic: Topic;
  originalQuery: string;
  strykInsight: string;
}

/**
 * Formats Strykr.ai insights for posting to social media platforms
 */
export class ContentFormatter {
  /**
   * Format content for Telegram and Twitter posts
   * @param queryResult The original query and context
   * @param strykResponse The response from Strykr.ai
   * @returns Formatted content for each platform
   */
  public formatContent(queryResult: QueryResult, strykResponse: StrykrResponse): FormattedContent {
    // Get emoji based on topic category
    const categoryEmoji = this.getCategoryEmoji(queryResult.topic.category);
    
    // Extract a headline from the tweet content
    const headline = this.generateHeadline(queryResult.sourceText, queryResult.topic);
    
    // Format for Telegram (can be longer and supports markdown)
    const telegramContent = this.formatTelegramContent(
      categoryEmoji,
      headline,
      strykResponse.insight,
      queryResult.topic
    );
    
    // Format for Twitter (shorter, character limited)
    const twitterContent = this.formatTwitterContent(
      categoryEmoji,
      headline,
      strykResponse.insight,
      queryResult.topic
    );
    
    return {
      telegram: telegramContent,
      twitter: twitterContent,
      topic: queryResult.topic,
      originalQuery: queryResult.query,
      strykInsight: strykResponse.insight
    };
  }
  
  /**
   * Format content specifically for Telegram
   */
  private formatTelegramContent(
    emoji: string,
    headline: string,
    insight: string,
    topic: Topic
  ): string {
    // Create hashtags from topic keywords (limit to 3)
    const hashtags = topic.keywords
      .slice(0, 3)
      .map(kw => `#${kw.replace(/\s+/g, '')}`).join(' ');
    
    // Build the full Telegram message with markdown
    return `${emoji} *BREAKING NEWS*\n${headline}\n\nWe asked Stryk.ai for insight. Here's what it said:\n\n"${insight}"\n\n${hashtags}\n\n_Follow @Stryk.ai for hourly AI-powered market briefings._`;
  }
  
  /**
   * Format content specifically for Twitter
   */
  private formatTwitterContent(
    emoji: string,
    headline: string,
    insight: string,
    topic: Topic
  ): string {
    // Create hashtags from topic keywords (limit to 2)
    const hashtags = topic.keywords
      .slice(0, 2)
      .map(kw => `#${kw.replace(/\s+/g, '')}`).join(' ');
    
    // Shorten the insight if needed to fit Twitter's character limit
    let shortenedInsight = insight;
    const maxInsightLength = 180; // Reserve space for the rest of the content
    
    if (insight.length > maxInsightLength) {
      shortenedInsight = insight.substring(0, maxInsightLength - 3) + '...';
    }
    
    // Build the Twitter post
    return `${emoji} BREAKING: ${headline}\n\nStryk.ai says:\n\n"${shortenedInsight}"\n\n${hashtags} #Stryk.ai`;
  }
  
  /**
   * Get appropriate emoji for the financial category
   */
  private getCategoryEmoji(category: string): string {
    switch (category) {
      case 'MACROECONOMICS':
        return '🏛️';
      case 'EARNINGS':
        return '📊';
      case 'TECH_AI':
        return '🧠';
      case 'CRYPTO':
        return '💰';
      case 'REGULATION':
        return '⚖️';
      default:
        return '🚨';
    }
  }
  
  /**
   * Generate a concise headline from the tweet text
   */
  private generateHeadline(tweetText: string, topic: Topic): string {
    // Extract first sentence or limit to 80 chars
    let headline = tweetText.split(/[.!?]/, 1)[0].trim();
    
    if (headline.length > 80) {
      headline = headline.substring(0, 77) + '...';
    }
    
    // If headline is too short, create a generic one using the topic
    if (headline.length < 20) {
      const topicName = topic.category.toLowerCase().replace('_', ' ');
      const keyword = topic.keywords[0] || topicName;
      headline = `Latest ${keyword} news impacting markets`;
    }
    
    return headline;
  }
}
