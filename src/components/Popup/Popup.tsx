import { useEventStore } from "../../context/EventContext";
import { usePopup } from "../../context/PopupContext";
import { Settings } from "../Settings";
import { Crosstable } from "../Crosstable";

export const Popup = () => {
  const cccEvent = useEventStore((state) => state.cccEvent);
  const popupState = usePopup((state) => state.popupState);

  return (
    <>
      {popupState !== "none" && (
        <div className="popup">
          {popupState === "crosstable" && cccEvent && <Crosstable />}
          {popupState === "settings" && <Settings />}
        </div>
      )}
    </>
  );
};
