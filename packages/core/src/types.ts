/**
 * Shared type definitions for the Stryk.ai Auto Bot
 */

/**
 * Financial category types for categorization and query building
 */
export enum FinancialCategory {
  MACROECONOMICS = 'MACROECONOMICS',
  EARNINGS = 'EARNINGS',
  TECH_AI = 'TECH_AI',
  CRYPTO = 'CRYPTO',
  REGULATION = 'REGULATION'
}

/**
 * Financial tweet with metadata and engagement metrics
 */
export interface FinancialTweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername: string;
  createdAt: Date;
  engagement: {
    retweets: number;
    likes: number;
    replies: number;
    quotes: number;
  };
  keywords?: string[];
  category?: FinancialCategory;
}

/**
 * Cache record for processed financial topics
 */
export interface ProcessedTopicCache {
  id: string;
  category: FinancialCategory;
  keywords: string[];
  timestamp: Date;
  query: string;
  strykrResponse: string;
  telegramContent: string;
  twitterContent: string;
}

/**
 * Configuration options for the financial monitoring system
 */
export interface StrykrBotConfig {
  monitoringSchedule: string;
  financialAccounts: string[];
  maxTopicsPerRun: number;
  minEngagementScore: number;
  enableDeduplication: boolean;
  debug: boolean;
}
