import { create } from "zustand";
import type { EngineSettings } from "../engine/EngineWorker";
import { zustandHmrFix } from "./ZustandHMRFix";
import { loadSettings } from "@/LocalStorage";

function getDefaultKibitzerSettings(): EngineSettings {
  const settings = loadSettings();

  const loadedSettings = {
    hash: settings["hash"] ? Number(settings["hash"]) : 128,
    threads: settings["threads"] ? Number(settings["threads"]) : 1,
    enableKibitzer: settings["enableKibitzer"] === "true",
  };

  return loadedSettings;
}

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
