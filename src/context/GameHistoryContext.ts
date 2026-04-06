import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

enableMapSet();

type GameData = { moveList: string[]; fenList: string[] };
export type TranspositionDataEntry = { moveNumber: number; diverge?: string };

type GameHistoryState = {
  transpositionsList: TranspositionDataEntry[];

  currentGameData: GameData | null;
  reverseGameData: GameData | null;

  setTranspositions: (list: TranspositionDataEntry[]) => void;

  setDataForReverse: (history: GameData | null) => void;
  setDataForCurrent: (history: GameData | null) => void;
};

export const useGameHistory = create<GameHistoryState>()(
  immer((set) => ({
    transpositionsList: [],

    currentGameData: null,
    reverseGameData: null,

    setTranspositions(list) {
      set((state) => {
        state.transpositionsList = list;
      });
    },
    setDataForReverse(history) {
      set((state) => {
        state.reverseGameData = history;
      });
    },
    setDataForCurrent(history) {
      set((state) => {
        state.currentGameData = history;
      });
    },
  }))
);
