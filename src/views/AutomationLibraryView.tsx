import React, { useState } from 'react';

const MOCK_WORKFLOWS = [
  { id: 'wf_1', name: 'Start Meeting Mode', triggers: ['Fingers Crossed'], status: 'active', lastRun: '2 mins ago' },
  { id: 'wf_2', name: 'Focus Mode', triggers: ['Swipe Down Two Hands'], status: 'active', lastRun: '1 hour ago' },
  { id: 'wf_3', name: 'Code Review Setup', triggers: ['Pinch & Pull'], status: 'inactive', lastRun: '2 days ago' },
];

export const AutomationLibraryView: React.FC = () => {
  const [workflows, setWorkflows] = useState(MOCK_WORKFLOWS);

  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Automation Library</h1>
          <p className="text-slate-400">Manage, enable, and view your saved AI workflows.</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm font-medium transition-colors">
          Create New Workflow
        </button>
      </header>

      <div className="bg-slate-800 rounded-xl border border-slate-700 shadow-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-700/50">
            <tr>
              <th className="px-6 py-4 font-semibold text-slate-300">Workflow Name</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Triggers</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Status</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Last Run</th>
              <th className="px-6 py-4 font-semibold text-slate-300">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50">
            {workflows.map(wf => (
              <tr key={wf.id} className="hover:bg-slate-700/20 transition-colors">
                <td className="px-6 py-4 font-medium">{wf.name}</td>
                <td className="px-6 py-4">
                  <div className="flex gap-2">
                    {wf.triggers.map(t => (
                      <span key={t} className="bg-slate-700 px-2 py-1 rounded text-xs font-mono">{t}</span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded text-xs ${wf.status === 'active' ? 'bg-emerald-900 text-emerald-300' : 'bg-slate-700 text-slate-300'}`}>
                    {wf.status.toUpperCase()}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-400 text-sm">{wf.lastRun}</td>
                <td className="px-6 py-4">
                  <button className="text-blue-400 hover:text-blue-300 mr-4 font-medium text-sm">Edit</button>
                  <button className="text-red-400 hover:text-red-300 font-medium text-sm">Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
