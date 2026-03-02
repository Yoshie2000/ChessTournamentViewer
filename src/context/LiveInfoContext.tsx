import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EmptyEngineDefinition,
  type LiveEngineData,
  type LiveEngineDataEntry,
  type LiveEngineDataEntryObject,
  type LiveEngineDataObject,
} from "../LiveInfo";

type MoveNumberInfo = { current: number; prev: number };

type LiveInfoData = {
  liveInfos: LiveEngineDataEntry;
  setLiveInfos: (
    color: keyof LiveEngineDataEntry,
    data: Partial<LiveEngineDataEntryObject>
  ) => void;

  liveEngineData_REF_REPLACEMENT: LiveEngineData;
  setLiveEngineData_REF_REPL: (
    color: keyof LiveEngineData,
    data: Partial<LiveEngineDataObject>
  ) => void;

  moveNumberInfo: MoveNumberInfo;
  setCurrentMoveNumber: (data: Partial<MoveNumberInfo>) => void;
};

export const useLiveInfo = create<LiveInfoData>()(
  immer((set) => ({
    liveEngineData_REF_REPLACEMENT: {
      white: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
      black: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
      blue: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
      green: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
      red: { engineInfo: EmptyEngineDefinition, liveInfo: [] },
    },
    liveInfos: {
      white: { engineInfo: EmptyEngineDefinition, liveInfo: undefined },
      black: { engineInfo: EmptyEngineDefinition, liveInfo: undefined },
      blue: { engineInfo: EmptyEngineDefinition, liveInfo: undefined },
      green: { engineInfo: EmptyEngineDefinition, liveInfo: undefined },
      red: { engineInfo: EmptyEngineDefinition, liveInfo: undefined },
    },
    moveNumberInfo: { current: -1, prev: -1 },
    setCurrentMoveNumber(data) {
      set((state) => {
        state.moveNumberInfo = { ...state.moveNumberInfo, ...data };
      });
    },
    setLiveEngineData_REF_REPL(color, data) {
      set((state) => {
        state.liveEngineData_REF_REPLACEMENT[color] = {
          ...state.liveEngineData_REF_REPLACEMENT[color],
          ...data,
        };
      });
    },
    setLiveInfos(color, data) {
      set((state) => {
        state.liveInfos[color] = { ...state.liveInfos[color], ...data };
      });
    },
  }))
);
