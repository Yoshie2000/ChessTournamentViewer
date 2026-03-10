import { create } from "zustand";
import { immer } from "zustand/middleware/immer";

import {
  EmptyEngineDefinition,
  type LiveEngineData,
  type LiveEngineDataEntry,
  type LiveEngineDataObject,
} from "../LiveInfo";
import { Chess, Chess960 } from "../chess.js/chess";
import type { CCCClocks, CCCLiveInfo } from "../types";
import { getLiveInfosForMove } from "../LiveInfo";
import { subscribeWithSelector } from "zustand/middleware";
import { zustandHmrFix } from "./ZustandHMRFix";

type LiveInfoData = {
  liveInfos: LiveEngineDataEntry;

  liveEngineData: LiveEngineData;
  setLiveEngineData: (
    color: keyof LiveEngineData,
    data: Partial<LiveEngineDataObject>
  ) => void;
  updateLiveEngineData: (
    color: keyof LiveEngineData,
    data: CCCLiveInfo
  ) => void;

  moves: string[];
  setMoves: (moves: string[]) => void;

  clocks: CCCClocks;
  setClocks: (callback: (clocks: CCCClocks) => CCCClocks) => void;

  currentMoveNumber: number;
  setCurrentMoveNumber: (callback: (previous: number) => number) => void;

  currentFen: string;
  setCurrentFen: (fen: string) => void;

  game: Chess960;
};

export const useLiveInfo = create<LiveInfoData>()(
  subscribeWithSelector(
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

      clocks: { binc: "0", winc: "0", btime: "0", wtime: "0", type: "clocks" },
      setClocks(callback) {
        set((state) => {
          state.clocks = callback(state.clocks);
        });
      },

      currentMoveNumber: -1,
      currentFen: new Chess().fen(),
      game: new Chess960(),

      setCurrentFen(fen) {
        set({ currentFen: fen });
      },
      setCurrentMoveNumber(callback) {
        set((state) => {
          state.currentMoveNumber = callback(state.currentMoveNumber);
          state.currentFen = state.game.fenAt(state.currentMoveNumber);

          state.liveInfos = getLiveInfosForMove(
            state.liveEngineData,
            state.currentMoveNumber,
            state.game.turnAt(state.currentMoveNumber)
          );
        });
      },

      moves: [],
      setMoves(moves) {
        set((state) => {
          state.moves = moves;
        });
      },

      setLiveEngineData(color, data) {
        set((state) => {
          state.liveEngineData[color] = {
            ...state.liveEngineData[color],
            ...data,
          };

          state.liveInfos = getLiveInfosForMove(
            state.liveEngineData,
            state.currentMoveNumber,
            state.game.turnAt(state.currentMoveNumber)
          );
        });
      },
      updateLiveEngineData(color, data) {
        set((state) => {
          const newLiveInfos = [...state.liveEngineData[color].liveInfo];
          newLiveInfos[data.info.ply] = data;
          state.liveEngineData[color].liveInfo = newLiveInfos;

          state.liveInfos = getLiveInfosForMove(
            state.liveEngineData,
            state.currentMoveNumber,
            state.game.turnAt(state.currentMoveNumber)
          );
        });
      },
    }))
  )
);

zustandHmrFix("eventContext", useLiveInfo);
