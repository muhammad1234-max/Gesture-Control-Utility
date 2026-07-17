import React, { useState, useEffect } from 'react';

// Mock context for the UI
const MOCK_CONTEXT = {
  activeApp: 'Chrome.exe',
  windowTitle: 'GitHub - Main',
  privacyModeStrict: false,
  isScreenLocked: false
};

const MOCK_METRICS = {
  plannerLatencyMs: 120,
  llmLatencyMs: 850,
  routingLatencyMs: 12,
  activeTokens: 2500,
  workflowsExecuted: 42,
  skillsInvoked: 128
};

export const AIDashboardView: React.FC = () => {
  const [context, setContext] = useState(MOCK_CONTEXT);
  const [metrics, setMetrics] = useState(MOCK_METRICS);

  return (
    <div className="p-6 text-white bg-slate-900 min-h-screen">
      <header className="mb-8">
        <h1 className="text-3xl font-bold mb-2">AI Copilot Dashboard</h1>
        <p className="text-slate-400">Monitor system intelligence, active context, and orchestration metrics.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {/* Context Card */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-blue-400">Current Context</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Active App</span>
              <span className="font-mono bg-slate-900 px-2 rounded text-sm">{context.activeApp}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Window Title</span>
              <span className="font-mono bg-slate-900 px-2 rounded text-sm truncate max-w-[150px]" title={context.windowTitle}>{context.windowTitle}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Privacy Mode</span>
              <span className={`px-2 rounded text-sm ${context.privacyModeStrict ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}>
                {context.privacyModeStrict ? 'Strict' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Telemetry Card */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-purple-400">Telemetry</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Planner Latency</span>
              <span className="font-mono">{metrics.plannerLatencyMs}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">LLM Latency</span>
              <span className="font-mono">{metrics.llmLatencyMs}ms</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Tokens Used</span>
              <span className="font-mono">{metrics.activeTokens}</span>
            </div>
          </div>
        </div>

        {/* Orchestration Stats */}
        <div className="bg-slate-800 p-5 rounded-xl border border-slate-700 shadow-lg">
          <h2 className="text-xl font-semibold mb-4 text-emerald-400">Orchestration</h2>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400">Workflows Executed</span>
              <span className="font-mono text-emerald-300 font-bold">{metrics.workflowsExecuted}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Skills Invoked</span>
              <span className="font-mono">{metrics.skillsInvoked}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
