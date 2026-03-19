import { useEventStore } from "../../context/EventContext";
import { usePopup } from "../../context/PopupContext";
import { Settings } from "./Settings";
import { Crosstable } from "./Crosstable";
import "./Popup.css";

export const Popup = () => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const popupState = usePopup((state) => state.popupState);

  return (
    <>
      {popupState !== "none" && (
        <div className="popup">
          {popupState === "crosstable" && activeEvent && <Crosstable />}
          {popupState === "settings" && <Settings />}
        </div>
      )}
    </>
  );
};
