import { create } from "zustand";
import type { EngineSettings } from "../engine/EngineWorker";
import { getDefaultKibitzerSettings } from "../components/Popup/Settings";
import { zustandHmrFix } from "./ZustandHMRFix";
import { loadSettings } from "@/LocalStorage";

export type SettingsType = {
  kibitzerSettings: EngineSettings;
  setKibitzerSettings: (settings: EngineSettings) => void;

  showCoordinates: boolean;
  setShowCoordinates: (showCoordinates: boolean) => void;
};

export const useSettings = create<SettingsType>()((set) => ({
  kibitzerSettings: getDefaultKibitzerSettings(),
  setKibitzerSettings(settings) {
    set({ kibitzerSettings: settings });
  },

  showCoordinates: loadSettings()["showCoordinates"] === "true",
  setShowCoordinates(showCoordinates) {
    set({ showCoordinates });
  },
}));

zustandHmrFix("settingsContext", useSettings);
