import { DatabaseManager } from '../db/DatabaseManager';

export enum GoalState {
  Pending = 'Pending',
  Planning = 'Planning',
  Waiting = 'Waiting',
  Executing = 'Executing',
  Paused = 'Paused',
  Completed = 'Completed',
  Cancelled = 'Cancelled',
  Failed = 'Failed',
  RolledBack = 'RolledBack'
}

export interface Goal {
  id: string;
  description: string;
  state: GoalState;
  createdAt: number;
  updatedAt: number;
}

export class GoalManager {
  private static instance: GoalManager;

  private constructor() {}

  public static getInstance(): GoalManager {
    if (!GoalManager.instance) {
      GoalManager.instance = new GoalManager();
    }
    return GoalManager.instance;
  }

  public createGoal(description: string): Goal {
    const goal: Goal = {
      id: `goal_${Date.now()}`,
      description,
      state: GoalState.Pending,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const db = DatabaseManager.getInstance().getConnection();
    const stmt = db.prepare('INSERT INTO goals (id, state, description, created_at, updated_at) VALUES (?, ?, ?, ?, ?)');
    stmt.run(goal.id, goal.state, goal.description, goal.createdAt, goal.updatedAt);
    
    console.log(`[GoalManager] Created goal: ${goal.id} -> ${GoalState.Pending}`);
    return goal;
  }

  public transitionState(goalId: string, newState: GoalState): void {
    const db = DatabaseManager.getInstance().getConnection();
    
    // Check valid transitions (simplified for now)
    console.log(`[GoalManager] Transitioning goal ${goalId} to ${newState}`);
    
    const stmt = db.prepare('UPDATE goals SET state = ?, updated_at = ? WHERE id = ?');
    stmt.run(newState, Date.now(), goalId);
  }

  public getActiveGoals(): Goal[] {
    const db = DatabaseManager.getInstance().getConnection();
    const stmt = db.prepare('SELECT * FROM goals WHERE state NOT IN (?, ?, ?, ?)');
    return stmt.all(GoalState.Completed, GoalState.Cancelled, GoalState.Failed, GoalState.RolledBack) as Goal[];
  }
}
