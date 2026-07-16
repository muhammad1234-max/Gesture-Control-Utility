import fs from 'fs';
import path from 'path';
import { PathManager } from '../system/PathManager';
import { Logger } from '../system/Logger';

export interface ProfileMetrics {
  [metricName: string]: {
    values: number[]; // Rolling buffer
    lastUpdated: number;
  }
}

export class UserProfiler {
  private static instance: UserProfiler;
  private profilePath: string;
  private metrics: ProfileMetrics = {};
  private readonly MAX_HISTORY = 1000;

  private constructor() {
    this.profilePath = path.join(PathManager.getInstance().profilesDir, 'adaptive_profile.json');
    this.loadProfile();
  }

  public static getInstance(): UserProfiler {
    if (!UserProfiler.instance) {
      UserProfiler.instance = new UserProfiler();
    }
    return UserProfiler.instance;
  }

  public recordMetric(metricName: string, value: number) {
    if (!this.metrics[metricName]) {
      this.metrics[metricName] = { values: [], lastUpdated: 0 };
    }
    
    this.metrics[metricName].values.push(value);
    if (this.metrics[metricName].values.length > this.MAX_HISTORY) {
      this.metrics[metricName].values.shift();
    }
    this.metrics[metricName].lastUpdated = Date.now();
  }

  public getMetricHistory(metricName: string): number[] {
    return this.metrics[metricName]?.values || [];
  }

  public saveProfile() {
    try {
      fs.writeFileSync(this.profilePath, JSON.stringify(this.metrics, null, 2));
    } catch (e: any) {
      Logger.error('Failed to save adaptive profile', { error: e.message });
    }
  }

  private loadProfile() {
    if (fs.existsSync(this.profilePath)) {
      try {
        this.metrics = JSON.parse(fs.readFileSync(this.profilePath, 'utf8'));
      } catch (e) {
        Logger.warn('Corrupted adaptive profile, starting fresh');
      }
    }
  }
}
