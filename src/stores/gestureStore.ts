import { create } from 'zustand';

// Placeholder for gesture recognition state beyond profiles
interface GestureState {
  lastRecognizedGesture: string | null;
  setLastRecognizedGesture: (gesture: string | null) => void;
}

export const useGestureStore = create<GestureState>((set) => ({
  lastRecognizedGesture: null,
  setLastRecognizedGesture: (gesture) => set({ lastRecognizedGesture: gesture }),
}));
