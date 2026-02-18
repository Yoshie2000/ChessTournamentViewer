import { MdOutlineClose } from "react-icons/md";
import type { EngineSettings } from "../engine/EngineWorker";
import "./Settings.css";
import { useState } from "react";

type SettingsProps = {
  kibitzerSettings: EngineSettings;
  setKibitzerSettings: (settings: EngineSettings) => void;
  onClose: () => void;
};

export function getDefaultKibitzerSettings(): EngineSettings {
  return {
    hash: localStorage.getItem("kibitzerHash")
      ? Number(localStorage.getItem("kibitzerHash"))
      : 1,
    threads: localStorage.getItem("kibitzerThreads")
      ? Number(localStorage.getItem("kibitzerThreads"))
      : 1,
    enableKibitzer: localStorage.getItem("kibitzerEnabled") === "true",
  };
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
    localStorage.setItem("kibitzerHash", String(hash));
    localStorage.setItem("kibitzerThreads", String(threads));
    localStorage.setItem("kibitzerEnabled", String(enableKibitzer));
    setKibitzerSettings({ hash, threads, enableKibitzer });
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
