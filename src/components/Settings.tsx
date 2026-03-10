import { MdOutlineClose } from "react-icons/md";
import type { EngineSettings } from "../engine/EngineWorker";
import "./Settings.css";
import { memo, useState } from "react";
import { loadSettings, saveSettings } from "../LocalStorage";
import { usePopup } from "../context/PopupContext";
import { useKibitzerSettings } from "../context/KibitzerSettings";

export function getDefaultKibitzerSettings(): EngineSettings {
  const settings = loadSettings();

  const loadedSettings = {
    hash: settings["hash"] ? Number(settings["hash"]) : 128,
    threads: settings["threads"] ? Number(settings["threads"]) : 1,
    enableKibitzer: settings["enableKibitzer"] === "true",
  };

  return loadedSettings;
}

export const Settings = memo(() => {
  const kibitzerSettings = useKibitzerSettings(
    (state) => state.kibitzerSettings
  );
  const setKibitzerSettings = useKibitzerSettings(
    (state) => state.setKibitzerSettings
  );

  const [hash, setHash] = useState(kibitzerSettings.hash);
  const [threads, setThreads] = useState(kibitzerSettings.threads);
  const [enableKibitzer, setEnableKibitzer] = useState(
    kibitzerSettings.enableKibitzer
  );

  const setPopupState = usePopup((state) => state.setPopupState);

  function applySettings() {
    const settings = { hash, threads, enableKibitzer };
    saveSettings(settings);
    setKibitzerSettings(settings);
  }

  return (
    <div className="settings">
      <div className="settingsHeader">
        <h4>Kibitzer Settings</h4>
        <button
          className="closeButton"
          onClick={() => setPopupState("none")}
          title="Close"
        >
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
});
