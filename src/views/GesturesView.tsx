import React from 'react';
import { MousePointer2, Move, Navigation, Type } from 'lucide-react';
import { useAppStore } from '@stores/appStore';
import { ActionCard } from '@components/ActionCard';
import { ToggleSwitch } from '@components/ToggleSwitch';
import { ConfigurationController } from '@controllers/ConfigurationController';

export default function GesturesView() {
  const config = useAppStore(state => state.config);

  const gestures = [
    {
      id: 'cursor_movement',
      name: 'Cursor Movement',
      description: 'Move your hand to move the mouse cursor. Point your index finger naturally.',
      icon: Navigation,
      enabled: true, // Core feature, always enabled
      hasToggle: false,
      setting: null
    },
    {
      id: 'left_click',
      name: 'Left Click',
      description: 'Pinch your index finger and thumb together to trigger a standard left click.',
      icon: MousePointer2,
      enabled: config?.gestureMap?.pinchIndex !== 'none',
      hasToggle: true,
      onToggle: (checked: boolean) => ConfigurationController.apply({ gestureMap: { ...config?.gestureMap, pinchIndex: checked ? 'left_click' : 'none' } })
    },
    {
      id: 'right_click',
      name: 'Right Click',
      description: 'Pinch your middle finger and thumb together to trigger a right click.',
      icon: MousePointer2,
      enabled: config?.gestureMap?.pinchMiddle !== 'none',
      hasToggle: true,
      onToggle: (checked: boolean) => ConfigurationController.apply({ gestureMap: { ...config?.gestureMap, pinchMiddle: checked ? 'right_click' : 'none' } })
    },
    {
      id: 'scroll',
      name: 'Smart Scroll',
      description: 'Pinch and drag up or down to scroll pages naturally.',
      icon: Move,
      enabled: config?.gestureMap?.scrollEnabled !== false,
      hasToggle: true,
      onToggle: (checked: boolean) => ConfigurationController.apply({ gestureMap: { ...config?.gestureMap, scrollEnabled: checked } })
    }
  ];

  return (
    <div className="space-y-6 animate-[var(--animate-native-fade)]">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-h1">Gesture Library</h2>
          <p className="text-body mt-1">Enable and configure available gestures.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {gestures.map((gesture) => (
          <ActionCard
            key={gesture.id}
            title={gesture.name}
            description={gesture.description}
            icon={gesture.icon}
            isActive={gesture.enabled}
            rightElement={gesture.hasToggle ? (
              <ToggleSwitch 
                checked={gesture.enabled} 
                onChange={(checked) => gesture.onToggle?.(checked)} 
              />
            ) : undefined}
          />
        ))}
      </div>
    </div>
  );
}
