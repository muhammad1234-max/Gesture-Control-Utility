import React, { useState } from 'react';

const MOCK_AGENTS = [
  { id: 'agent.planning', name: 'Planning Agent', status: 'thinking', cpu: '12%', mem: '45MB' },
  { id: 'agent.execution', name: 'Execution Agent', status: 'idle', cpu: '1%', mem: '12MB' },
  { id: 'agent.memory', name: 'Memory Agent', status: 'reflecting', cpu: '8%', mem: '60MB' },
  { id: 'agent.context', name: 'Context Agent', status: 'observing', cpu: '2%', mem: '20MB' },
];

export const AgentDashboardView: React.FC = () => {
  const [agents, setAgents] = useState(MOCK_AGENTS);

  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Agent Swarm Dashboard</h1>
        <p className="text-slate-400">Monitor active agents, their states, and resource consumption.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {agents.map(agent => (
          <div key={agent.id} className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
            <h2 className="text-lg font-semibold text-blue-400 mb-2">{agent.name}</h2>
            <div className="text-xs text-slate-400 mb-4 font-mono">{agent.id}</div>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Status</span>
                <span className={`px-2 py-1 rounded text-xs uppercase font-bold
                  ${agent.status === 'thinking' ? 'bg-yellow-900 text-yellow-300' : ''}
                  ${agent.status === 'idle' ? 'bg-slate-700 text-slate-300' : ''}
                  ${agent.status === 'reflecting' ? 'bg-purple-900 text-purple-300' : ''}
                  ${agent.status === 'observing' ? 'bg-emerald-900 text-emerald-300' : ''}
                `}>
                  {agent.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>CPU</span>
                <span className="font-mono">{agent.cpu}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Memory</span>
                <span className="font-mono">{agent.mem}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
