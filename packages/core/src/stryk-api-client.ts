import axios from 'axios';
import * as dotenv from 'dotenv';

dotenv.config();

/**
 * Response from the Strykr AI API
 */
export interface StrykResponse {
  insight: string;
  confidence: number;
  sources?: string[];
  timestamp: string;
}

/**
 * Client for interacting with the Strykr AI API
 */
export class StrykApiClient {
  private readonly apiUrl: string;
  private readonly apiKey: string;

  /**
   * Initialize the Strykr API client
   */
  constructor() {
    this.apiUrl = process.env.STRYK_API_URL || 'https://api.stryk.ai/v1';
    this.apiKey = process.env.STRYK_API_KEY || '';
    
    if (!this.apiKey) {
      console.error('STRYK_API_KEY is not set. API requests will fail.');
    }
  }

  /**
   * Send a query to the Strykr AI API and get financial insights
   * @param query The financial query to send to Strykr AI
   * @returns The response from Stryk.ai with financial insights
   */
  public async getInsight(query: string): Promise<StrykResponse> {
    try {
      const response = await axios.post(
        `${this.apiUrl}/insights`,
        {
          query,
          format: 'concise',
          max_length: 280 // Twitter character limit
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
            'X-Stryk-Client': 'auto-bot'
          },
          timeout: 30000 // 30 seconds timeout
        }
      );

      return {
        insight: response.data.insight || 'No insight available',
        confidence: response.data.confidence || 0,
        sources: response.data.sources,
        timestamp: response.data.timestamp || new Date().toISOString()
      };
    } catch (error) {
      console.error('Error calling Stryk.ai API:', error);
      
      // Return a fallback response
      return {
        insight: 'Unable to retrieve insights from Stryk.ai at this time. Please try again later.',
        confidence: 0,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if the API client is properly configured and can connect
   * @returns True if the client can connect to the API
   */
  public async testConnection(): Promise<boolean> {
    try {
      const response = await axios.get(`${this.apiUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`
        },
        timeout: 5000
      });
      
      return response.status === 200;
    } catch (error) {
      console.error('Failed to connect to Stryk.ai API:', error);
      return false;
    }
  }
}
