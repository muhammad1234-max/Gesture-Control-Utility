import React from 'react';
import { LucideIcon } from 'lucide-react';

interface ActionCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  isActive?: boolean;
  rightElement?: React.ReactNode;
}

export function ActionCard({ title, description, icon: Icon, isActive = false, rightElement }: ActionCardProps) {
  return (
    <div className="card card-hover p-4 flex flex-col justify-between space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-[8px] transition-colors ${isActive ? 'bg-[var(--color-primary)] text-white' : 'bg-[#27272a] text-[var(--color-text-secondary)]'}`}>
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-[13px] font-semibold text-white leading-tight">{title}</h3>
          </div>
        </div>
        {rightElement && (
          <div className="shrink-0" onClick={e => e.stopPropagation()}>
            {rightElement}
          </div>
        )}
      </div>
      
      <div className="bg-[#09090b] rounded-[8px] p-3 border border-[var(--color-border)] min-h-[3rem] flex items-center">
         <p className="text-body text-[12px] leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
