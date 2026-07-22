import React from 'react';
import { useAppStore } from '@stores/appStore';
import { CheckCircle, AlertTriangle, Info, X } from 'lucide-react';

export const ToastManager: React.FC = () => {
  const toast = useAppStore(state => state.toast);
  const clearToast = useAppStore(state => state.clearToast);

  if (!toast) return null;

  const Icon = toast.type === 'success' ? CheckCircle : toast.type === 'warn' ? AlertTriangle : Info;
  const colorClass = toast.type === 'success' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 
                     toast.type === 'warn' ? 'text-amber-400 bg-amber-500/10 border-amber-500/20' : 
                     'text-sky-400 bg-sky-500/10 border-sky-500/20';

  return (
    <div className="fixed top-16 right-6 z-[100] animate-in slide-in-from-right-4 fade-in duration-300">
      <div className={`flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl bg-[#09090d]/90 w-80 ${colorClass}`}>
        <Icon className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="flex-1">
          <h4 className="text-sm font-bold text-white">{toast.title}</h4>
          <p className="text-xs text-white/70 mt-1 leading-relaxed">{toast.message}</p>
        </div>
        <button onClick={() => clearToast(toast.id)} className="text-white/40 hover:text-white transition-colors shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
