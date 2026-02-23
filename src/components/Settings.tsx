import { MdOutlineClose } from "react-icons/md";
import type { EngineSettings } from "../engine/EngineWorker";
import "./Settings.css";
import { useState } from "react";
import { loadSettings, saveSettings } from "../LocalStorage";

type SettingsProps = {
  kibitzerSettings: EngineSettings;
  setKibitzerSettings: (settings: EngineSettings) => void;
  onClose: () => void;
};

export function getDefaultKibitzerSettings(): EngineSettings {
  const settings = loadSettings();

  const loadedSettings = {
    hash: settings["hash"] ? Number(settings["hash"]) : 128,
    threads: settings["threads"]
      ? Number(settings["threads"])
      : 1,
    enableKibitzer: settings["enableKibitzer"] === "true",
  };

  return loadedSettings;
}

export function Settings({
  kibitzerSettings,
  onClose,
  setKibitzerSettings,
}: SettingsProps) {
  const [hash, setHash] = useState(kibitzerSettings.hash);
  const [threads, setThreads] = useState(kibitzerSettings.threads);
  const [enableKibitzer, setEnableKibitzer] = useState(
    kibitzerSettings.enableKibitzer
  );

  function applySettings() {
    const settings = { hash, threads, enableKibitzer };
    saveSettings(settings);
    setKibitzerSettings(settings);
  }

  return (
    <div className="settings">
      <div className="settingsHeader">
        <h4>Kibitzer Settings</h4>
        <button className="closeButton" onClick={onClose}>
          <MdOutlineClose />
        </button>
      </div>

      <div className="engineSettings">
        <div className="checkbox">
          <input
            type="checkbox"
            id="id0"
            checked={enableKibitzer}
            onChange={(e) => setEnableKibitzer(e.target.checked)}
          />
          <label htmlFor="id0">Enable Kibitzer</label>
        </div>
      </div>

      <div className="engineSettings">
        <div className="input">
          <label htmlFor="id1">Hash</label>
          <input
            id="id1"
            type="number"
            value={hash}
            onChange={(e) => setHash(Number(e.target.value))}
          />
        </div>
        <div className="input">
          <label htmlFor="id2">Threads</label>
          <input
            id="id2"
            type="number"
            value={threads}
            onChange={(e) => setThreads(Number(e.target.value))}
          />
        </div>
      </div>

      <button className="applySettings" onClick={applySettings}>
        Apply Settings
      </button>
    </div>
  );
}
