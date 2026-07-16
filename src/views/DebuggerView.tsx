import React from 'react';
import { useTelemetryStore } from '@stores/telemetryStore';
import { Activity, Cpu, Server, CheckCircle2, AlertTriangle, XCircle, Clock } from 'lucide-react';

export default function DebuggerView() {
  const telemetry = useTelemetryStore(state => state);
  const services = (telemetry as any).runtime || [];

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'HEALTHY': return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
      case 'WARNING': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      case 'DEGRADED': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
      case 'CRITICAL': return 'text-rose-400 bg-rose-500/10 border-rose-500/20';
      case 'OFFLINE': return 'text-slate-500 bg-slate-800 border-slate-700';
      default: return 'text-slate-500 bg-slate-800 border-slate-700';
    }
  };

  const getStateBadge = (state: string) => {
    if (state === 'RUNNING') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400">RUNNING</span>;
    if (state === 'FAILED') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-500/20 text-rose-400">FAILED</span>;
    if (state === 'STARTING') return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-blue-500/20 text-blue-400">STARTING</span>;
    return <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 text-slate-400">{state}</span>;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-100 flex items-center gap-3">
            <Server className="w-6 h-6 text-indigo-400" />
            Runtime Orchestrator Diagnostics
          </h2>
          <p className="text-slate-400 mt-1">Live telemetry and health matrices for all registered IServices.</p>
        </div>
      </div>

      {/* Runtime Timeline */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl p-6 shadow-sm">
        <h3 className="text-sm font-medium text-slate-300 mb-6 uppercase tracking-wider flex items-center gap-2">
          <Clock className="w-4 h-4" /> Startup Timeline (DAG)
        </h3>
        
        <div className="space-y-3">
          {services.map((s: any, i: number) => {
            // Mock visualization of startup time/order
            const width = Math.max(10, Math.random() * 40 + 10);
            const delay = i * 10;
            return (
              <div key={s.name} className="flex items-center gap-4">
                <div className="w-40 text-right text-sm text-slate-400 font-mono">{s.name}</div>
                <div className="flex-1 bg-slate-900 rounded-full h-3 overflow-hidden flex">
                  <div style={{ width: `${delay}%` }} className="h-full bg-transparent"></div>
                  <div style={{ width: `${width}%` }} className={`h-full rounded-full ${s.state === 'RUNNING' ? 'bg-indigo-500' : 'bg-slate-700'}`}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Service Telemetry Matrix */}
      <div className="bg-[#14171d] border border-slate-800/60 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-800/60 bg-slate-900/30">
          <h3 className="text-sm font-medium text-slate-300 uppercase tracking-wider flex items-center gap-2">
            <Activity className="w-4 h-4" /> Service Health Matrix
          </h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-400">
            <thead className="bg-slate-900/50 text-slate-500 border-b border-slate-800/60 font-mono text-xs">
              <tr>
                <th className="px-4 py-3 font-medium">Service Name</th>
                <th className="px-4 py-3 font-medium">State</th>
                <th className="px-4 py-3 font-medium">Health</th>
                <th className="px-4 py-3 font-medium">Uptime</th>
                <th className="px-4 py-3 font-medium">Restarts</th>
                <th className="px-4 py-3 font-medium">CPU %</th>
                <th className="px-4 py-3 font-medium">Mem (MB)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {services.map((s: any) => (
                <tr key={s.name} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-300">{s.name}</td>
                  <td className="px-4 py-3">{getStateBadge(s.state)}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full border text-xs font-medium flex items-center w-fit gap-1.5 ${getHealthColor(s.health)}`}>
                      {s.health === 'HEALTHY' && <CheckCircle2 className="w-3 h-3" />}
                      {s.health === 'WARNING' && <AlertTriangle className="w-3 h-3" />}
                      {s.health === 'CRITICAL' && <XCircle className="w-3 h-3" />}
                      {s.health}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{(s.metrics?.uptimeMs / 1000).toFixed(1)}s</td>
                  <td className="px-4 py-3 font-mono text-xs">{s.metrics?.restartCount}</td>
                  <td className="px-4 py-3 font-mono text-xs">{(s.metrics?.cpuUsagePct || 0).toFixed(1)}%</td>
                  <td className="px-4 py-3 font-mono text-xs">{(s.metrics?.memoryUsageMb || 0).toFixed(1)}</td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">No services registered in RuntimeManager.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
