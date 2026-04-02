import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type GameData = { moveList: string[]; fenList: string[] };
export type TranspositionDataEntry = { moveNumber: number; diverge?: string };

type GameHistoryState = {
  gameDataMap: Record<number, GameData>;
  transpositionHistory: Record<number, TranspositionDataEntry[]>;

  setTranspositions: (
    gameNumber: number,
    list: TranspositionDataEntry[]
  ) => void;
  setDataForGame: (gameNumber: number, history: GameData) => void;
};

export const useGameHistory = create<GameHistoryState>()(
  immer((set) => ({
    gameDataMap: {},
    transpositionHistory: {},

    // TODO we don't need this "top" level
    samePositionsList: [],

    setTranspositions(gameNumber, list) {
      set((state) => {
        state.transpositionHistory[gameNumber] = list;
      });
    },
    setDataForGame(gameNumber, history) {
      set((state) => {
        state.gameDataMap[gameNumber] = history;
      });
    },
  }))
);
