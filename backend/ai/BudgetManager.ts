import { AIEventBus, AIEventType } from './AIEventBus';

export interface BudgetConfig {
  dailyTokenLimit: number;
  maxCostPerDay: number; // in USD or credits
  maxRequestsPerMinute: number;
}

export class BudgetManager {
  private static instance: BudgetManager;

  private tokensUsedToday: number = 0;
  private costIncurredToday: number = 0;
  private requestsInCurrentMinute: number = 0;
  
  private config: BudgetConfig = {
    dailyTokenLimit: 1000000,
    maxCostPerDay: 5.0,
    maxRequestsPerMinute: 60
  };

  private constructor() {
    // Reset limits periodically, typically at midnight, 
    // and reset requestsPerMinute every minute via setInterval.
    setInterval(() => {
      this.requestsInCurrentMinute = 0;
    }, 60000);
  }

  public static getInstance(): BudgetManager {
    if (!BudgetManager.instance) {
      BudgetManager.instance = new BudgetManager();
    }
    return BudgetManager.instance;
  }

  public canProcessRequest(estimatedTokens: number): boolean {
    if (this.requestsInCurrentMinute >= this.config.maxRequestsPerMinute) {
      return false;
    }
    if (this.tokensUsedToday + estimatedTokens > this.config.dailyTokenLimit) {
      this.publishBudgetWarning('Token limit approached or exceeded');
      return false;
    }
    return true;
  }

  public recordUsage(tokens: number, cost: number): void {
    this.tokensUsedToday += tokens;
    this.costIncurredToday += cost;
    this.requestsInCurrentMinute += 1;

    if (this.tokensUsedToday >= this.config.dailyTokenLimit * 0.9) {
      this.publishBudgetWarning('90% of daily token limit reached.');
    }
  }

  private publishBudgetWarning(message: string): void {
    AIEventBus.getInstance().publish({
      type: AIEventType.TokenBudgetWarning,
      timestamp: Date.now(),
      payload: { message, tokensUsed: this.tokensUsedToday }
    });
  }
}
