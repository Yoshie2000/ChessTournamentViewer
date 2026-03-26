import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type GameHistoryEntry = { moveList: string[]; fenList: string[] };
export type TranspositionDataEntry = { moveNumber: number; diverge?: string };

type GameHistoryState = {
  history: Record<number, GameHistoryEntry>;
  transpositionHistory: Record<number, TranspositionDataEntry[]>;
  setTranspositions: (
    gameNumber: number,
    list: TranspositionDataEntry[]
  ) => void;
  setDataForGame: (gameNumber: number, history: GameHistoryEntry) => void;
};

export const useGameHistory = create<GameHistoryState>()(
  immer((set) => ({
    history: {},
    transpositionHistory: {},
    samePositionsList: [],
    setTranspositions(gameNumber, list) {
      set((state) => {
        state.transpositionHistory[gameNumber] = list;
      });
    },
    setDataForGame(gameNumber, history) {
      set((state) => {
        state.history[gameNumber] = history;
      });
    },
  }))
);
