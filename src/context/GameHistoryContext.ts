import { enableMapSet } from "immer";
import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

enableMapSet();

type GameData = { moveList: string[]; fenList: string[] };
export type TranspositionDataEntry = { moveNumber: number; diverge?: string };

type GameHistoryState = {
  gameDataMap: Record<number, GameData>;
  transpositionHistory: Record<number, TranspositionDataEntry[]>;

  /**
   * set of pending reverse-game requests
   * to avoid duplicate requests
   */
  waitingSet: Set<number>;
  setWaiting: (gameNr: number) => void;

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

    samePositionsList: [],

    waitingSet: new Set<number>(),

    setTranspositions(gameNumber, list) {
      set((state) => {
        state.transpositionHistory[gameNumber] = list;
      });
    },
    setDataForGame(gameNumber, history) {
      set((state) => {
        state.gameDataMap[gameNumber] = history;
        if (state.waitingSet.has(gameNumber)) {
          state.waitingSet.delete(gameNumber);
        }
      });
    },
    setWaiting(gameNr) {
      set((state) => {
        state.waitingSet.add(gameNr);
      });
    },
  }))
);
