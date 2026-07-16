import { AdaptivePolicyEngine } from './AdaptivePolicyEngine';

export interface Recommendation {
  id: string;
  targetKeyPath: string;
  recommendedValue: any;
  confidence: number;
  reason: string;
  expectedImprovement: string;
  timestamp: number;
}

export class RecommendationEngine {
  private static instance: RecommendationEngine;

  private constructor() {}

  public static getInstance(): RecommendationEngine {
    if (!RecommendationEngine.instance) {
      RecommendationEngine.instance = new RecommendationEngine();
    }
    return RecommendationEngine.instance;
  }

  public dispatchRecommendation(rec: Recommendation) {
    // Route it to the Policy Engine which decides to auto-apply, wait, or ask user.
    AdaptivePolicyEngine.getInstance().evaluateRecommendation(rec);
  }
}
