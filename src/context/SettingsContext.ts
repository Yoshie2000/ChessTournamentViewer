import { create } from "zustand";
import type { EngineSettings } from "../engine/EngineWorker";
import { getDefaultKibitzerSettings } from "../components/Popup/Settings";
import { zustandHmrFix } from "./ZustandHMRFix";

type Settings = {
  kibitzerSettings: EngineSettings;
  setKibitzerSettings: (settings: EngineSettings) => void;
};

export const useSettings = create<Settings>()((set) => ({
  kibitzerSettings: getDefaultKibitzerSettings(),
  setKibitzerSettings(settings) {
    set({ kibitzerSettings: settings });
  },
}));

zustandHmrFix("settingsContext", useSettings);
