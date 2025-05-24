/**
 * @file index.ts
 * @description Main entry point for the Stryk.ai Auto Bot core package
 */

import { MainOrchestrator } from './main-orchestrator.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Export all components for use in other packages
export { TwitterScraper, EnrichedTweet } from './twitter-scraper.js';
export { CategorizationEngine, Topic } from './categorization-engine.js';
export { QueryBuilder, QueryResult } from './query-builder.js';
export { StrykApiClient, StrykResponse } from './stryk-api-client.js';
export { ContentFormatter, FormattedContent } from './content-formatter.js';
export { MainOrchestrator } from './main-orchestrator.js';

/**
 * Start the Strykr AI Auto Bot if this file is executed directly
 */
const isMainModule = (): boolean => {
  return typeof require !== 'undefined' && require.main === module;
};

if (isMainModule()) {
  console.log('Starting Stryk.ai Auto Bot...');
  
  const orchestrator = new MainOrchestrator();
  
  // Get schedule from environment or use default (hourly)
  const schedule = process.env.MONITORING_SCHEDULE || '0 * * * *';
  
  // Start the automated process
  orchestrator.startAutomatedProcess(schedule);
  
  console.log(`Stryk.ai Auto Bot running with schedule: ${schedule}`);
  console.log('Press Ctrl+C to stop');
}
