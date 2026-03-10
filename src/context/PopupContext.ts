import { create } from "zustand";
import { zustandHmrFix } from "./ZustandHMRFix";

type PopupStateValues = "crosstable" | "settings" | "none";

type PopupContext = {
  popupState: PopupStateValues;
  setPopupState: (val: PopupStateValues) => void;
};

export const usePopup = create<PopupContext>((set) => ({
  popupState: "none",
  setPopupState(val) {
    set({ popupState: val });
  },
}));

zustandHmrFix("popupContext", usePopup);
