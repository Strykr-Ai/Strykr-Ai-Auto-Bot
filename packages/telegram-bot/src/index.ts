import { Telegraf, Markup } from "telegraf";
import { MainOrchestrator, FormattedContent } from "@strykr-ai/core";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import fs from "fs";

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the root .env file
const envPath = resolve(__dirname, "../../../.env");

/**
 * Telegram Bot wrapper for Strykr.ai Auto Bot
 */
class StrykrTelegramBot {
  private bot: Telegraf;
  private orchestrator: MainOrchestrator;
  private channelId: string;
  private isRunning: boolean = false;
  private postInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize the Telegram bot
   */
  constructor() {
    // Load environment variables
    this.loadEnvironment();
    
    // Initialize Telegram bot
    this.bot = new Telegraf(process.env.TELEGRAM_BOT_TOKEN!);
    
    // Set the channel ID for announcements
    this.channelId = process.env.TELEGRAM_CHANNEL_ID || '';
    
    // Initialize the main orchestrator
    this.orchestrator = new MainOrchestrator();
  }

  /**
   * Load environment variables
   */
  private loadEnvironment(): void {
    // Check if .env file exists
    if (!fs.existsSync(envPath)) {
      console.error(`Error: .env file not found at ${envPath}`);
      process.exit(1);
    }
    
    // Load environment variables
    console.log(`Loading environment variables from ${envPath}`);
    const result = dotenv.config({ path: envPath });
    
    if (result.error) {
      console.error('Error loading .env file:', result.error);
      process.exit(1);
    }
    
    // Check for required environment variables
    const requiredVars = ['TELEGRAM_BOT_TOKEN'];
    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error(`Error: Missing required environment variables: ${missingVars.join(', ')}`);
      process.exit(1);
    }
    
    // Warn if no channel ID is set
    if (!process.env.TELEGRAM_CHANNEL_ID) {
      console.warn('Warning: TELEGRAM_CHANNEL_ID is not set. Announcements will not be sent to a channel.');
    }
  }

  /**
   * Initialize bot commands and handlers
   */
  private initializeBot(): void {
    // Set up bot commands
    this.bot.command('start', (ctx) => {
      ctx.reply(
        'Welcome to the Strykr.ai Auto Bot! 🚀\n\n' +
        'I monitor financial markets and post AI-powered insights based on trending topics.\n\n' +
        'Use /help to see available commands.'
      );
    });

    this.bot.command('help', (ctx) => {
      ctx.reply(
        'Available commands:\n\n' +
        '/start - Start the bot\n' +
        '/help - Show this help message\n' +
        '/status - Check the bot status\n' +
        '/run - Run the financial monitoring process once\n' +
        '/schedule - Start scheduled posting\n' +
        '/stop - Stop scheduled posting\n' +
        '/info - About Strykr.ai Auto Bot'
      );
    });

    this.bot.command('status', async (ctx) => {
      const status = this.isRunning ? 
        '✅ The bot is running and posting on schedule' : 
        '⏸️ The bot is not currently posting on a schedule';
      
      ctx.reply(status);
    });

    this.bot.command('run', async (ctx) => {
      await ctx.reply('🔍 Running financial monitoring process...');
      
      try {
        // Run the process and get the result
        const result = await this.orchestrator.runFullProcess();
        
        if (result.success) {
          // Get the latest content
          const content = await this.orchestrator.getLatestContent();
          
          if (content) {
            // Post to the current chat
            await ctx.reply(content.telegram, { parse_mode: 'Markdown' });
            
            // Also post to the channel if set
            if (this.channelId) {
              await this.postToChannel(content.telegram);
              await ctx.reply('✅ Posted to the announcement channel!');
            }
          } else {
            await ctx.reply('✅ Process completed, but no new content was generated.');
          }
        } else {
          await ctx.reply(`❌ Process failed: ${result.message}`);
        }
      } catch (error) {
        console.error('Error running process:', error);
        await ctx.reply('❌ An error occurred while running the process.');
      }
    });

    this.bot.command('schedule', (ctx) => {
      if (this.isRunning) {
        ctx.reply('⚠️ The bot is already running on a schedule.');
        return;
      }
      
      // Get schedule from environment or use default (hourly)
      const schedule = process.env.MONITORING_SCHEDULE || '0 * * * *';
      const intervalMinutes = 60; // Default to hourly
      
      // Start the posting schedule
      this.startSchedule(intervalMinutes);
      
      ctx.reply(
        `✅ Scheduled posting started!\n\n` +
        `The bot will check for trending financial topics and post insights every ${intervalMinutes} minutes.\n\n` +
        `Use /stop to stop scheduled posting.`
      );
    });

    this.bot.command('stop', (ctx) => {
      if (!this.isRunning) {
        ctx.reply('⚠️ The bot is not currently running on a schedule.');
        return;
      }
      
      // Stop the posting schedule
      this.stopSchedule();
      
      ctx.reply('✅ Scheduled posting stopped. Use /schedule to start again.');
    });

    this.bot.command('info', (ctx) => {
      ctx.reply(
        'ℹ️ About Strykr.ai Auto Bot\n\n' +
        'This bot monitors financial Twitter accounts, identifies trending topics, ' +
        'and generates insights using the Strykr.ai API.\n\n' +
        'Created by the Strykr.ai team'
      );
    });

    // Handle unknown commands
    this.bot.on('text', (ctx) => {
      if (ctx.message.text.startsWith('/')) {
        ctx.reply('Unknown command. Use /help to see available commands.');
      }
    });
  }

  /**
   * Start the posting schedule
   */
  private startSchedule(intervalMinutes: number): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    
    // Convert minutes to milliseconds
    const intervalMs = intervalMinutes * 60 * 1000;
    
    // Set up the interval
    this.postInterval = setInterval(async () => {
      try {
        console.log('Running scheduled financial monitoring process...');
        
        // Run the process
        const result = await this.orchestrator.runFullProcess();
        
        if (result.success) {
          // Get the latest content
          const content = await this.orchestrator.getLatestContent();
          
          if (content && this.channelId) {
            // Post to the channel
            await this.postToChannel(content.telegram);
            console.log('Posted new content to the announcement channel');
          }
        } else {
          console.log(`Scheduled process completed with status: ${result.message}`);
        }
      } catch (error) {
        console.error('Error in scheduled post:', error);
      }
    }, intervalMs);
    
    console.log(`Scheduled posting started with ${intervalMinutes} minute interval`);
  }

  /**
   * Stop the posting schedule
   */
  private stopSchedule(): void {
    if (!this.isRunning || !this.postInterval) return;
    
    clearInterval(this.postInterval);
    this.postInterval = null;
    this.isRunning = false;
    
    console.log('Scheduled posting stopped');
  }

  /**
   * Post a message to the announcement channel
   */
  private async postToChannel(message: string): Promise<void> {
    if (!this.channelId) {
      console.warn('No channel ID set, skipping channel post');
      return;
    }
    
    try {
      await this.bot.telegram.sendMessage(
        this.channelId,
        message,
        { parse_mode: 'Markdown' }
      );
    } catch (error) {
      console.error('Error posting to channel:', error);
      throw error;
    }
  }

  /**
   * Start the Strykr.ai Telegram bot
   */
  public async start(): Promise<void> {
    console.log('Starting Strykr.ai Telegram bot...');
    
    try {
      // Initialize bot commands and handlers
      this.initializeBot();
      
      // Launch the bot
      await this.bot.launch();
      console.log('Telegram bot is running!');
      
      // Handle graceful shutdown
      process.once('SIGINT', () => {
        this.stopSchedule();
        this.bot.stop('SIGINT');
      });
      
      process.once('SIGTERM', () => {
        this.stopSchedule();
        this.bot.stop('SIGTERM');
      });
    } catch (error) {
      console.error('Error starting Telegram bot:', error);
      throw error;
    }
  }
}

/**
 * Main function to run the bot
 */
async function main(): Promise<void> {
  try {
    const telegramBot = new StrykrTelegramBot();
    await telegramBot.start();
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  }
}

// Run the main function
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
