import React from 'react';
import { 
  LayoutDashboard, 
  Settings,
  Fingerprint,
  MousePointer2
} from 'lucide-react';
import { useAppStore } from '@stores/appStore';

export default function Sidebar() {
  const activeTab = useAppStore(state => state.activeTab);
  const setActiveTab = useAppStore(state => state.setActiveTab);

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'gestures', label: 'Gestures', icon: MousePointer2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-56 bg-[var(--color-bg-sidebar)] border-r border-[var(--color-border)] flex flex-col justify-between select-none shrink-0">
      <div className="p-4 pb-2">
        <div className="flex items-center gap-3 px-2 mb-6 mt-2">
          <div className="text-[var(--color-primary)]">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h1 className="font-sans font-semibold text-[var(--color-text-primary)] text-[14px] tracking-wide">
              Gesture Mouse
            </h1>
          </div>
        </div>

        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer relative ${
                  isActive
                    ? 'text-[var(--color-text-primary)] bg-white/5 before:absolute before:left-0 before:top-2 before:bottom-2 before:w-[3px] before:bg-[var(--color-primary)] before:rounded-r-full'
                    : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-white/[0.02]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[var(--color-primary)]' : ''}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
