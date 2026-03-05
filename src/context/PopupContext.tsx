import { create } from "zustand";

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
