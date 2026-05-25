import { MdOutlineClose } from "react-icons/md";
import "./Settings.css";
import { memo, useState } from "react";
import { saveSettings } from "../../LocalStorage";
import { usePopup } from "../../context/PopupContext";
import { useSettings } from "../../context/KibitzerSettings";

export const Settings = memo(() => {
  const settings = useSettings();

  const [hash, setHash] = useState(settings.kibitzerSettings.hash);
  const [threads, setThreads] = useState(settings.kibitzerSettings.threads);
  const [enableKibitzer, setEnableKibitzer] = useState(
    settings.kibitzerSettings.enableKibitzer
  );

  const [showCoordinates, setShowCoordinates] = useState(
    settings.showCoordinates
  );

  const setPopupState = usePopup((state) => state.setPopupState);

  function applySettings() {
    saveSettings({ hash, threads, enableKibitzer, showCoordinates });

    settings.setShowCoordinates(showCoordinates);
    settings.setKibitzerSettings({ hash, threads, enableKibitzer });

    if (showCoordinates !== settings.showCoordinates) location.reload();
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
        <small>
          The 'Threads' setting only applies to native kibitzers, not to
          Stockfish WASM
        </small>
      </div>

      <div className="settingsHeader">
        <h4>Native Kibitzers</h4>
      </div>

      <div className="engineSettings">
        <small>
          In order to use local UCI engines as kibitzers, download{" "}
          <a
            href="https://github.com/Yoshie2000/ChessTournamentViewer/blob/main/native_kibitzer.py"
            target="_blank"
          >
            native_kibitzer.py
          </a>{" "}
          and run it using{" "}
          <pre>python native_kibitzer.py /path/to/uci/engine</pre>
        </small>
      </div>

      <div className="settingsHeader">
        <h4>UI Settings</h4>
      </div>

      <div className="engineSettings">
        <div className="checkbox">
          <input
            type="checkbox"
            id="id3"
            checked={showCoordinates}
            onChange={(e) => setShowCoordinates(e.target.checked)}
          />
          <label htmlFor="id3">Show Board Coordinates</label>
        </div>
      </div>

      <button className="applySettings" onClick={applySettings}>
        Apply Settings
      </button>
    </div>
  );
});
