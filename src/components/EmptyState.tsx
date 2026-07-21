import React from 'react';
import { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon: Icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <div className="card p-8 flex flex-col items-center justify-center text-center min-h-[200px]">
      <div className="w-12 h-12 rounded-[12px] bg-white/5 flex items-center justify-center text-[var(--color-text-secondary)] mb-4">
        <Icon className="w-6 h-6" />
      </div>
      <h3 className="text-h2 mb-2">{title}</h3>
      <p className="text-body max-w-sm mb-6">{description}</p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-secondary">
          {actionLabel}
        </button>
      )}
    </div>
  );
}
