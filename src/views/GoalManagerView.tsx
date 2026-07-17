import React, { useState } from 'react';

const MOCK_GOALS = [
  { id: 'goal_123', description: 'Summarize open browser tabs into a markdown file', state: 'Executing', progress: '60%' },
  { id: 'goal_124', description: 'Monitor email for urgent project updates', state: 'Waiting', progress: '0%' },
  { id: 'goal_125', description: 'Prepare weekly report from git commits', state: 'Completed', progress: '100%' },
];

export const GoalManagerView: React.FC = () => {
  const [goals, setGoals] = useState(MOCK_GOALS);
  const [newGoal, setNewGoal] = useState('');

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (newGoal.trim()) {
      setGoals([{ id: `goal_${Date.now()}`, description: newGoal, state: 'Pending', progress: '0%' }, ...goals]);
      setNewGoal('');
    }
  };

  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">High-Level Goals</h1>
        <p className="text-slate-400">Delegate complex objectives to the Agent Swarm.</p>
      </header>

      <form onSubmit={handleAddGoal} className="mb-8 flex gap-4">
        <input 
          type="text" 
          value={newGoal}
          onChange={(e) => setNewGoal(e.target.value)}
          placeholder="E.g., Organize my messy downloads folder..."
          className="flex-1 bg-slate-800 border border-slate-600 rounded px-4 py-2 text-white focus:outline-none focus:border-blue-500"
        />
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-medium transition-colors">
          Delegate
        </button>
      </form>

      <div className="space-y-4">
        {goals.map(goal => (
          <div key={goal.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-medium">{goal.description}</h3>
              <span className={`px-2 py-1 rounded text-xs uppercase font-bold
                  ${goal.state === 'Pending' ? 'bg-slate-700 text-slate-300' : ''}
                  ${goal.state === 'Executing' ? 'bg-blue-900 text-blue-300' : ''}
                  ${goal.state === 'Waiting' ? 'bg-yellow-900 text-yellow-300' : ''}
                  ${goal.state === 'Completed' ? 'bg-emerald-900 text-emerald-300' : ''}
              `}>
                {goal.state}
              </span>
            </div>
            
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full ${goal.state === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`}
                style={{ width: goal.progress }}
              ></div>
            </div>
            <div className="text-right text-xs text-slate-400 mt-1">{goal.progress}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
