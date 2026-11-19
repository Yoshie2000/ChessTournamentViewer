import { useEffect } from "react";
import { useEventStore } from "../../context/EventContext";
import { usePopup } from "../../context/PopupContext";
import { Settings } from "./Settings";
import { Crosstable } from "./Crosstable";
import "./Popup.css";
import CupBrackets from "./CupBrackets";

export const Popup = () => {
  const activeEvent = useEventStore((state) => state.activeEvent);
  const popupState = usePopup((state) => state.popupState);
  const setPopupState = usePopup((state) => state.setPopupState);

  useEffect(() => {
    if (popupState === "none") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setPopupState("none");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [popupState, setPopupState]);

  return (
    <>
      {popupState !== "none" && (
        <div className="popup">
          {popupState === "crosstable" && activeEvent && <Crosstable />}
          {popupState === "cupBrackets" && activeEvent && <CupBrackets />}
          {popupState === "settings" && <Settings />}
        </div>
      )}
    </>
  );
};
