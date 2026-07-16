import fs from 'fs';
import path from 'path';
import { PathManager } from '../system/PathManager';
import { Recommendation } from './RecommendationEngine';
import { Logger } from '../system/Logger';

export interface AdaptiveRecord {
  timestamp: number;
  recommendation: Recommendation;
  previousValue: any;
  outcome: 'success' | 'reverted' | 'pending';
}

export class AdaptiveHistory {
  private static instance: AdaptiveHistory;
  private historyPath: string;
  private records: AdaptiveRecord[] = [];

  private constructor() {
    this.historyPath = path.join(PathManager.getInstance().profilesDir, 'adaptive_history.json');
    this.loadHistory();
  }

  public static getInstance(): AdaptiveHistory {
    if (!AdaptiveHistory.instance) {
      AdaptiveHistory.instance = new AdaptiveHistory();
    }
    return AdaptiveHistory.instance;
  }

  public recordChange(rec: Recommendation, previousValue: any = null) {
    this.records.push({
      timestamp: Date.now(),
      recommendation: rec,
      previousValue,
      outcome: 'pending'
    });
    
    if (this.records.length > 500) {
      this.records.shift();
    }
    
    this.saveHistory();
  }

  public updateOutcome(recId: string, outcome: 'success' | 'reverted') {
    const record = this.records.reverse().find(r => r.recommendation.id === recId);
    if (record) {
      record.outcome = outcome;
      this.saveHistory();
    }
  }

  private saveHistory() {
    try {
      fs.writeFileSync(this.historyPath, JSON.stringify(this.records, null, 2));
    } catch (e: any) {
      Logger.error('Failed to save adaptive history', { error: e.message });
    }
  }

  private loadHistory() {
    if (fs.existsSync(this.historyPath)) {
      try {
        this.records = JSON.parse(fs.readFileSync(this.historyPath, 'utf8'));
      } catch (e) {
        Logger.warn('Corrupted adaptive history');
      }
    }
  }
}
