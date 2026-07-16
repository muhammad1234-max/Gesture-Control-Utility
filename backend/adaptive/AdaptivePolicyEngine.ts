import { ConfigManager } from '../config/ConfigManager';
import { Recommendation } from './RecommendationEngine';
import { AdaptiveHistory } from './AdaptiveHistory';
import { Logger } from '../system/Logger';
import { WebSocketServer } from '../ipc/websocket';

export class AdaptivePolicyEngine {
  private static instance: AdaptivePolicyEngine;

  private constructor() {}

  public static getInstance(): AdaptivePolicyEngine {
    if (!AdaptivePolicyEngine.instance) {
      AdaptivePolicyEngine.instance = new AdaptivePolicyEngine();
    }
    return AdaptivePolicyEngine.instance;
  }

  public evaluateRecommendation(rec: Recommendation) {
    const config = ConfigManager.getInstance().getConfig();
    const mode = config.adaptive?.mode || 'disabled';

    if (mode === 'disabled') {
      return; // Learning continues, but no recommendations applied or prompted.
    }

    if (mode === 'automatic') {
      if (rec.confidence >= 0.85) {
        this.applyRecommendation(rec);
      }
    } else if (mode === 'assisted') {
      // Assisted mode: Low-risk auto-apply at 95%. Others prompt.
      const isLowRisk = rec.targetKeyPath.includes('smoothing') || 
                        rec.targetKeyPath.includes('filter') || 
                        rec.targetKeyPath.includes('sensitivity');
                        
      if (isLowRisk && rec.confidence >= 0.95) {
        this.applyRecommendation(rec);
      } else if (rec.confidence >= 0.85) {
        this.promptUser(rec);
      }
    } else if (mode === 'manual') {
      if (rec.confidence >= 0.85) {
        this.promptUser(rec);
      }
    }
  }

  private applyRecommendation(rec: Recommendation) {
    Logger.info(`Auto-applying adaptive recommendation: ${rec.id}`);
    
    // 1. Record History
    AdaptiveHistory.getInstance().recordChange(rec);
    
    // 2. Apply Override
    ConfigManager.getInstance().applyAdaptiveOverride(rec.targetKeyPath, rec.recommendedValue);
    
    // 3. Notify Frontend
    WebSocketServer.getInstance().broadcast('adaptive:applied', rec);
  }

  private promptUser(rec: Recommendation) {
    Logger.info(`Prompting user for adaptive recommendation: ${rec.id}`);
    WebSocketServer.getInstance().broadcast('adaptive:recommendation', rec);
  }
}
