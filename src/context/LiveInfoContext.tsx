import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EmptyEngineDefinition,
  type LiveEngineData,
  type LiveEngineDataEntry,
  type LiveEngineDataEntryObject,
  type LiveEngineDataObject,
} from "../LiveInfo";
import { Chess } from "../chess.js/chess";

type LiveInfoData = {
  liveInfos: LiveEngineDataEntry;
  setLiveInfos: (
    color: keyof LiveEngineDataEntry,
    data: Partial<LiveEngineDataEntryObject>
  ) => void;

  liveEngineData: LiveEngineData;
  setLiveEngineData: (
    color: keyof LiveEngineData,
    data: Partial<LiveEngineDataObject>
  ) => void;

  currentMoveNumber: number;
  setCurrentMoveNumber: (callback: (previous: number) => number) => void;

  currentFen: string;
  setCurrentFen: (fen: string) => void;
};

export const useLiveInfo = create<LiveInfoData>()(
  immer((set) => ({
    liveEngineData: {
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

    // probably should create another context for the game with
    // chess.js game and fen + move info and whatever game-related data?
    currentMoveNumber: -1,
    currentFen: new Chess().fen(),

    setCurrentFen(fen) {
      set({ currentFen: fen });
    },
    setCurrentMoveNumber(callback) {
      set((state) => {
        state.currentMoveNumber = callback(state.currentMoveNumber);
      });
    },
    // ================

    setLiveEngineData(color, data) {
      set((state) => {
        state.liveEngineData[color] = {
          ...state.liveEngineData[color],
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
