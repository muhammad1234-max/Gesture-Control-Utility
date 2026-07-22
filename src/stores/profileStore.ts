import { create } from 'zustand';
import { AppProfile, GestureMapping, CalibrationSettings } from '@shared/types';

const DEFAULT_GESTURES: GestureMapping[] = [
  { id: 'g1', name: 'Volume Booster', trigger: 'swipe-up', actionType: 'volume-control', targetAction: 'volume-up', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g2', name: 'Volume Quieter', trigger: 'swipe-down', actionType: 'volume-control', targetAction: 'volume-down', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g3', name: 'Music Backtrack', trigger: 'swipe-left', actionType: 'media-control', targetAction: 'media-prev', isActive: true, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g4', name: 'Music Skip Ahead', trigger: 'swipe-right', actionType: 'media-control', targetAction: 'media-next', isActive: true, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g5', name: 'Reveal Desktop Canvas', trigger: 'circle', actionType: 'keystroke', targetAction: 'Win + D', isActive: true, confidenceThreshold: 90, isSystemDefault: true },
  { id: 'g6', name: 'Instant Music Play', trigger: 'tap', actionType: 'media-control', targetAction: 'media-play', isActive: true, confidenceThreshold: 80, isSystemDefault: true },
  { id: 'g7', name: 'Toggle Sound Audio', trigger: 'double-tap', actionType: 'volume-control', targetAction: 'volume-mute', isActive: false, confidenceThreshold: 85, isSystemDefault: true },
  { id: 'g8', name: 'Trigger App Launcher', trigger: 'pinch', actionType: 'launch-app', targetAction: 'C:\\Windows\\System32\\calc.exe', isActive: true, confidenceThreshold: 90, isSystemDefault: true }
];

const DEFAULT_CALIBRATION: CalibrationSettings = {
  deadZone: 25,
  smoothing: 5,
  minConfidence: 80,
  accelerationCurve: [0.25, 0.1, 0.25, 1.0],
  webcamResolution: '1280x720',
  trackingFPS: 60
};

const DEFAULT_PROFILES: AppProfile[] = [
  {
    id: 'p1',
    name: 'Office (Default)',
    description: 'Balanced movement for everyday browsing and productivity.',
    isDefault: true,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION, deadZone: 25, smoothing: 5 }
  },
  {
    id: 'p2',
    name: 'Presentation',
    description: 'Slower cursor and higher stability for presenting slides.',
    isDefault: false,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION, deadZone: 40, smoothing: 8, accelerationCurve: [0.1, 0.5, 0.5, 1.0] }
  },
  {
    id: 'p3',
    name: 'Designer',
    description: 'Higher precision and larger smoothing for creative work.',
    isDefault: false,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION, deadZone: 15, smoothing: 7, accelerationCurve: [0.1, 0.9, 0.2, 1.0] }
  },
  {
    id: 'p4',
    name: 'Accessibility',
    description: 'Lower fatigue and higher gesture tolerance.',
    isDefault: false,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION, minConfidence: 60, deadZone: 30, smoothing: 6, accelerationCurve: [0.3, 0.2, 0.3, 1.0] }
  },
  {
    id: 'p5',
    name: 'Gaming (Experimental)',
    description: 'Lower latency and minimal smoothing.',
    isDefault: false,
    gestures: [...DEFAULT_GESTURES],
    calibration: { ...DEFAULT_CALIBRATION, deadZone: 10, smoothing: 1, accelerationCurve: [0.5, 0.1, 0.8, 1.0] }
  }
];

interface ProfileState {
  profiles: AppProfile[];
  activeProfileId: string;
  activeProfile: AppProfile;
  setProfiles: (profiles: AppProfile[]) => void;
  setActiveProfileId: (id: string) => void;
  updateActiveProfile: (updater: (profile: AppProfile) => AppProfile) => void;
  resetToDefaults: () => void;
}

const loadProfiles = (): AppProfile[] => {
  const cached = localStorage.getItem('gccc_profiles');
  if (cached) {
    try { return JSON.parse(cached); } catch (e) { console.error(e); }
  }
  return DEFAULT_PROFILES;
};

const loadActiveId = (): string => {
  return localStorage.getItem('gccc_active_profile_id') || 'p1';
};

export const useProfileStore = create<ProfileState>((set, get) => ({
  profiles: loadProfiles(),
  activeProfileId: loadActiveId(),
  
  get activeProfile() {
    return get().profiles.find(p => p.id === get().activeProfileId) || get().profiles[0];
  },

  setProfiles: (profiles) => {
    localStorage.setItem('gccc_profiles', JSON.stringify(profiles));
    set({ profiles });
  },

  setActiveProfileId: (id) => {
    localStorage.setItem('gccc_active_profile_id', id);
    set({ activeProfileId: id });
  },

  updateActiveProfile: (updater) => {
    const state = get();
    const updatedProfiles = state.profiles.map(p => {
      if (p.id === state.activeProfileId) {
        return updater(p);
      }
      return p;
    });
    get().setProfiles(updatedProfiles);
  },

  resetToDefaults: () => {
    const state = get();
    const updatedProfiles = state.profiles.map(p => {
      if (p.id === state.activeProfileId) {
        if (p.id === 'p1') {
          return { ...p, gestures: [...DEFAULT_GESTURES], calibration: { ...DEFAULT_CALIBRATION } };
        } else {
          return { ...p, gestures: [] };
        }
      }
      return p;
    });
    get().setProfiles(updatedProfiles);
  }
}));
