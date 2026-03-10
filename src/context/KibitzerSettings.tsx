import { create } from "zustand";
import type { EngineSettings } from "../engine/EngineWorker";
import { getDefaultKibitzerSettings } from "../components/Settings";

type KibitzerSettings = {
  kibitzerSettings: EngineSettings;
  setKibitzerSettings: (settings: EngineSettings) => void;
};

export const useKibitzerSettings = create<KibitzerSettings>()((set) => ({
  kibitzerSettings: getDefaultKibitzerSettings(),
  setKibitzerSettings(settings) {
    set({ kibitzerSettings: settings });
  },
}));
