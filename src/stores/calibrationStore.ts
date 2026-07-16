import { create } from 'zustand';

// Placeholder for active calibration wizard state
interface CalibrationState {
  isWizardActive: boolean;
  setWizardActive: (active: boolean) => void;
}

export const useCalibrationStore = create<CalibrationState>((set) => ({
  isWizardActive: false,
  setWizardActive: (active) => set({ isWizardActive: active }),
}));
