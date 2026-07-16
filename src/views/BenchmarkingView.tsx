import React from 'react';
import { useCameraStore } from '@stores/cameraStore';
import { Activity, Cpu, HardDrive, Clock, ShieldAlert } from 'lucide-react';

export default function BenchmarkingView() {
  const testingMetrics = useCameraStore(state => state.testingMetrics);

  if (!testingMetrics) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        Waiting for Observer Framework telemetry...
      </div>
    );
  }

  const { fps, memory, latencies, queues } = testingMetrics;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Activity className="w-6 h-6 text-fuchsia-500" />
            System Health & Validation
          </h2>
          <p className="text-slate-400 mt-1">Observer-only diagnostic framework for Phase 6.5</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Memory Stats */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <HardDrive className="w-4 h-4 text-sky-400" />
              <span className="text-sm font-medium">Node Memory</span>
            </div>
            {memory.isLeaking ? (
              <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">Leak Detected</span>
            ) : (
              <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">Stable</span>
            )}
          </div>
          <div className="text-2xl font-mono text-slate-100 mb-1">{memory.heapUsedMB.toFixed(1)} MB</div>
          <div className="text-[11px] text-slate-500 font-mono">
            RSS: {memory.rssMB.toFixed(1)} MB | Ext: {memory.externalMB.toFixed(1)} MB
          </div>
        </div>

        {/* FPS Sync */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-300 mb-4">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-medium">Pipeline Synchronization</span>
          </div>
          <div className="text-2xl font-mono text-slate-100 mb-1">{fps.tracking} FPS</div>
          <div className="text-[11px] text-slate-500 font-mono flex justify-between">
            <span>Cam: {fps.camera}</span>
            <span>Gest: {fps.gesture}</span>
            <span>Int: {fps.intent}</span>
          </div>
        </div>

        {/* Latency */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 text-slate-300 mb-4">
            <Clock className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-medium">Tracking Jitter</span>
          </div>
          <div className="text-2xl font-mono text-amber-400 mb-1">
            {latencies['Tracking']?.averageMs.toFixed(2) || '0.00'} ms
          </div>
          <div className="text-[11px] text-slate-500 font-mono">
            Max: {latencies['Tracking']?.maxMs.toFixed(2) || '0.00'} ms | StdDev: {latencies['Tracking']?.stdDevMs.toFixed(2) || '0.00'} ms
          </div>
        </div>

        {/* Queues */}
        <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-slate-300">
              <ShieldAlert className="w-4 h-4 text-fuchsia-400" />
              <span className="text-sm font-medium">Queue Health</span>
            </div>
            {queues.isBacklogged && (
              <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full border border-amber-500/30">Backlog</span>
            )}
          </div>
          <div className="text-2xl font-mono text-slate-100 mb-1">{queues.executionQueueDepth}</div>
          <div className="text-[11px] text-slate-500 uppercase tracking-wider">
            Movement Queue: {queues.movementQueueDepth}
          </div>
        </div>
      </div>
      
      {/* Detailed Latency Breakdown */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Latency Profiler (Observer-only)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="text-xs uppercase bg-slate-800/50 text-slate-500 border-b border-slate-700/50">
              <tr>
                <th className="px-4 py-3 font-medium">Pipeline Stage</th>
                <th className="px-4 py-3 font-medium">Average</th>
                <th className="px-4 py-3 font-medium">p95</th>
                <th className="px-4 py-3 font-medium">p99</th>
                <th className="px-4 py-3 font-medium">Max</th>
                <th className="px-4 py-3 font-medium">Jitter (StdDev)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(latencies).map(([stage, metrics]) => (
                <tr key={stage} className="border-b border-slate-800/50 hover:bg-slate-800/20 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-300">{stage}</td>
                  <td className="px-4 py-3 font-mono text-emerald-400">{metrics.averageMs.toFixed(2)} ms</td>
                  <td className="px-4 py-3 font-mono">{metrics.p95Ms.toFixed(2)} ms</td>
                  <td className="px-4 py-3 font-mono text-amber-400">{metrics.p99Ms.toFixed(2)} ms</td>
                  <td className="px-4 py-3 font-mono text-rose-400">{metrics.maxMs.toFixed(2)} ms</td>
                  <td className="px-4 py-3 font-mono">{metrics.stdDevMs.toFixed(2)} ms</td>
                </tr>
              ))}
              {Object.keys(latencies).length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No latency data collected yet.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
