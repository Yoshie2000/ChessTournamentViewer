import { MdOutlineClose } from "react-icons/md";
import "./Settings.css";
import { memo, useState } from "react";
import { saveSettings } from "../../LocalStorage";
import { usePopup } from "../../context/PopupContext";
import { useSettings } from "../../context/KibitzerSettings";
import { Button, Checkbox, InputNumber } from "@douyinfe/semi-ui";

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
        <Button
          className="closeButton"
          onClick={() => setPopupState("none")}
          title="Close"
        >
          <MdOutlineClose />
        </Button>
      </div>

      <div className="engineSettings">
        <Checkbox
          onChange={(e) => setEnableKibitzer(!!e.target.checked)}
          defaultChecked={enableKibitzer}
        >
          Enable Kibitzer
        </Checkbox>
      </div>

      <div className="engineSettings">
        <div className="input">
          <label htmlFor="hash">Hash</label>
          <InputNumber
            id="hash"
            value={hash}
            onChange={(value) => setHash(Number(value))}
          />
        </div>
        <div className="input">
          <label htmlFor="threads">Threads</label>
          <InputNumber
            id="threads"
            value={threads}
            onChange={(value) => setThreads(Number(value))}
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
        <Checkbox
          onChange={(e) => setShowCoordinates(!!e.target.checked)}
          defaultChecked={showCoordinates}
        >
          Show Board Coordinates
        </Checkbox>
      </div>

      <Button className="applySettings" onClick={applySettings}>
        Apply Settings
      </Button>
    </div>
  );
});
