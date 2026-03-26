import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

type GameHistory = {
  history: Record<number, string[]>;
  samePositionsList: number[];
  // list with indexes of all overlapping positions
  // that is used to underline moves list entries
  setOverlappingMovesIndxList: (list: number[]) => void;
  setFenListForGame: (gameNumber: number, history: string[]) => void;
};

export const useGameHistory = create<GameHistory>()(
  immer((set) => ({
    history: {},
    samePositionsList: [],
    setOverlappingMovesIndxList(list) {
      set((state) => {
        state.samePositionsList = list;
      });
    },
    setFenListForGame(gameNumber, history) {
      set((state) => {
        state.history[gameNumber] = history;
      });
    },
  }))
);
