import { TwitterScraper } from './twitter-scraper';
import { CategorizationEngine } from './categorization-engine';
import { QueryBuilder } from './query-builder';
import { StrykrApiClient } from './strykr-api-client.js';
import { ContentFormatter } from './content-formatter';
import * as cron from 'node-cron';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Main orchestrator that coordinates all components of the Strykr.ai financial monitoring system
 */
export class MainOrchestrator {
  private twitterScraper: TwitterScraper;
  private categorizationEngine: CategorizationEngine;
  private queryBuilder: QueryBuilder;
  private strykrApiClient: StrykrApiClient;
  private contentFormatter: ContentFormatter;
  private cacheDir: string;
  private isRunning: boolean = false;

  constructor() {
    // Initialize all components
    this.twitterScraper = new TwitterScraper();
    this.categorizationEngine = new CategorizationEngine();
    this.queryBuilder = new QueryBuilder();
    this.strykrApiClient = new StrykrApiClient();
    this.contentFormatter = new ContentFormatter();
    
    // Set up cache directory for processed queries
    this.cacheDir = path.join(__dirname, '../../..', 'data', 'cache');
    this.ensureCacheDirectoryExists();
  }

  /**
   * Start the automated monitoring and posting process
   * @param cronSchedule Cron schedule expression (default: every hour)
   */
  public startAutomatedProcess(cronSchedule: string = '0 * * * *'): void {
    console.log(`Starting Strykr.ai financial monitoring system...`);
    console.log(`Scheduled to run with cron pattern: ${cronSchedule}`);
    
    // Run immediately on start
    this.runFullProcess().catch(err => {
      console.error('Error in initial process run:', err);
    });
    
    // Schedule regular runs
    cron.schedule(cronSchedule, async () => {
      try {
        await this.runFullProcess();
      } catch (error) {
        console.error('Error in scheduled process run:', error);
      }
    });
  }

  /**
   * Run the full process once manually
   * @returns Results of the process
   */
  public async runFullProcess(): Promise<{ success: boolean; message: string }> {
    // Prevent concurrent execution
    if (this.isRunning) {
      return { success: false, message: 'Process already running' };
    }
    
    this.isRunning = true;
    console.log(`[${new Date().toISOString()}] Starting financial monitoring process...`);
    
    try {
      // Step 1: Fetch recent financial tweets
      console.log('Fetching recent financial tweets...');
      const tweets = await this.twitterScraper.fetchRecentFinancialTweets();
      
      if (tweets.length === 0) {
        console.log('No relevant financial tweets found in the last period');
        this.isRunning = false;
        return { success: true, message: 'No relevant tweets found' };
      }
      
      console.log(`Found ${tweets.length} relevant financial tweets`);
      
      // Step 2: Categorize tweets into financial topics
      console.log('Categorizing financial topics...');
      const topics = await this.categorizationEngine.categorizeTopics(tweets);
      
      if (topics.length === 0) {
        console.log('No significant financial topics identified');
        this.isRunning = false;
        return { success: true, message: 'No significant topics identified' };
      }
      
      console.log(`Identified ${topics.length} financial topics`);
      
      // Step 3: Build a query for the most significant topic
      const topTopic = topics[0];
      console.log(`Selected top topic: ${topTopic.category} (score: ${topTopic.score})`);
      
      const queryResult = this.queryBuilder.buildQuery(topTopic);
      console.log(`Generated query: "${queryResult.query}"`);
      
      // Check if we've recently processed this topic to avoid duplicates
      const isRecentlyProcessed = await this.checkIfRecentlyProcessed(
        topTopic.category,
        topTopic.keywords.join(',')
      );
      
      if (isRecentlyProcessed) {
        console.log('This topic was recently processed, skipping to avoid duplication');
        this.isRunning = false;
        return { success: true, message: 'Topic recently processed, skipped' };
      }
      
      // Step 4: Send query to Strykr.ai API
      console.log('Requesting insights from Strykr.ai...');
      const strykrResponse = await this.strykrApiClient.getInsight(queryResult.query);
      
      // Step 5: Format content for social media
      console.log('Formatting content for social media...');
      const formattedContent = this.contentFormatter.formatContent(queryResult, strykrResponse);
      
      // Step 6: Cache this processed topic
      await this.cacheProcessedTopic(
        topTopic.category,
        topTopic.keywords.join(','),
        formattedContent
      );
      
      // Return the formatted content for posting
      // (actual posting will be handled by the telegram-bot and twitter-bot packages)
      console.log('Process completed successfully');
      this.isRunning = false;
      
      return {
        success: true,
        message: 'Financial insights generated successfully'
      };
    } catch (error) {
      console.error('Error in financial monitoring process:', error);
      this.isRunning = false;
      return {
        success: false,
        message: `Process failed with error: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
  
  /**
   * Get the most recently generated content (for telegram/twitter bots to consume)
   * @returns The most recent formatted content or null if none available
   */
  public async getLatestContent(): Promise<{
    telegram: string;
    twitter: string;
    timestamp: Date;
  } | null> {
    try {
      const cacheFiles = await fs.promises.readdir(this.cacheDir);
      
      if (cacheFiles.length === 0) {
        return null;
      }
      
      // Sort by timestamp (filenames are in timestamp format)
      cacheFiles.sort().reverse();
      
      // Read the most recent cache file
      const latestFile = path.join(this.cacheDir, cacheFiles[0]);
      const fileContent = await fs.promises.readFile(latestFile, 'utf-8');
      const cachedData = JSON.parse(fileContent);
      
      return {
        telegram: cachedData.formattedContent.telegram,
        twitter: cachedData.formattedContent.twitter,
        timestamp: new Date(cachedData.timestamp)
      };
    } catch (error) {
      console.error('Error reading latest content:', error);
      return null;
    }
  }
  
  /**
   * Check if a topic has been recently processed (within the last 6 hours)
   */
  private async checkIfRecentlyProcessed(category: string, keywords: string): Promise<boolean> {
    try {
      const sixHoursAgo = new Date();
      sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
      
      const cacheFiles = await fs.promises.readdir(this.cacheDir);
      
      for (const file of cacheFiles) {
        // Skip files older than 6 hours based on filename timestamp
        const fileTimestamp = new Date(file.split('.')[0]);
        if (fileTimestamp < sixHoursAgo) continue;
        
        // Check file contents for category and keywords match
        const filePath = path.join(this.cacheDir, file);
        const fileContent = await fs.promises.readFile(filePath, 'utf-8');
        const cachedData = JSON.parse(fileContent);
        
        if (
          cachedData.category === category &&
          cachedData.keywords.split(',').some((kw: string) => keywords.includes(kw))
        ) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('Error checking for recently processed topics:', error);
      return false; // On error, assume not processed
    }
  }
  
  /**
   * Cache a processed topic to avoid duplication
   */
  private async cacheProcessedTopic(
    category: string,
    keywords: string,
    formattedContent: any
  ): Promise<void> {
    try {
      const timestamp = new Date().toISOString();
      const fileName = `${timestamp}.json`;
      const filePath = path.join(this.cacheDir, fileName);
      
      const cacheData = {
        timestamp,
        category,
        keywords,
        formattedContent
      };
      
      await fs.promises.writeFile(filePath, JSON.stringify(cacheData, null, 2), 'utf-8');
      
      // Clean up old cache files (keep last 100)
      const cacheFiles = await fs.promises.readdir(this.cacheDir);
      
      if (cacheFiles.length > 100) {
        // Sort by name (timestamp) ascending
        cacheFiles.sort();
        
        // Delete oldest files
        const filesToDelete = cacheFiles.slice(0, cacheFiles.length - 100);
        for (const file of filesToDelete) {
          await fs.promises.unlink(path.join(this.cacheDir, file));
        }
      }
    } catch (error) {
      console.error('Error caching processed topic:', error);
    }
  }
  
  /**
   * Ensure cache directory exists
   */
  private ensureCacheDirectoryExists(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }
}
