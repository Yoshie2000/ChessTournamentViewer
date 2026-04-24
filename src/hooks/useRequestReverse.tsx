import type { TournamentWebSocket } from "@/CCCWebsocket";
import { Chess960 } from "@/chess.js/chess";
import { useEventStore } from "@/context/EventContext";
import {
  useGameHistory,
  type TranspositionDataEntry,
} from "@/context/GameHistoryContext";
import { useLiveInfo } from "@/context/LiveInfoContext";
import { useEffect } from "react";

export const useRequestReverse = (
  fetchReverseFor: TournamentWebSocket["fetchReverseFor"]
) => {
  const game = useLiveInfo((state) => state.game);
  const activeGameNumber = useEventStore((state) =>
    Number(state.activeGame?.gameDetails.gameNr)
  );
  const activeEvent = useEventStore((state) => state.activeEvent);

  const currentGameData = useGameHistory((state) => state.currentGameData);
  const reverseGameData = useGameHistory((state) => state.reverseGameData);

  const setTranspositionsList = useGameHistory(
    (state) => state.setTranspositions
  );

  useEffect(() => {
    const firstGameNumberOfTheEvent: number | null =
      Number(activeEvent?.tournamentDetails.schedule.past[0].gameNr) ||
      Number(activeEvent?.tournamentDetails.schedule.present?.gameNr) ||
      null;

    if (!activeGameNumber || !firstGameNumberOfTheEvent) {
      return;
    }

    const fetchReverse = async (gameNumber: number) => {
      try {
        const reverseData = await fetchReverseFor(gameNumber);

        if (!reverseData) {
          useGameHistory.getState().setDataForReverse(null);
          return;
        }
        const { pgn } = reverseData;

        const chess = new Chess960();
        chess.loadPgn(pgn);

        const gameData = chess.boardFenHistory();

        useGameHistory.getState().setDataForReverse(gameData);
      } catch (err) {
        console.log(err);
        useGameHistory
          .getState()
          .setDataForReverse({ fenList: [], moveList: [] });
        return;
      }
    };

    fetchReverse(activeGameNumber);
    useGameHistory.getState().setDataForCurrent(game.boardFenHistory());
  }, [
    activeEvent?.tournamentDetails.schedule.past,
    activeEvent?.tournamentDetails.schedule.present?.gameNr,
    activeGameNumber,
    fetchReverseFor,
    game,
  ]);

  useEffect(() => {
    const currentFenList = currentGameData?.fenList;
    const reverseGameFenList = reverseGameData?.fenList;
    const reverseGameMoveList = reverseGameData?.moveList;

    if (!(currentFenList && reverseGameFenList && reverseGameMoveList)) {
      return;
    }

    const fenSet = new Set<string>(reverseGameFenList);
    const samePositionsList: TranspositionDataEntry[] = [];

    let wasSamePosition = false;
    currentFenList.forEach((fen, i, array) => {
      if (fenSet.has(fen)) {
        samePositionsList.push({ moveNumber: i });

        wasSamePosition = true;
      } else if (wasSamePosition) {
        const prevFen = array[i - 1];
        const divergeMoveIndex = reverseGameFenList.findLastIndex(
          (val) => prevFen === val
        );
        const move = reverseGameMoveList[divergeMoveIndex];

        wasSamePosition = false;

        samePositionsList.push({ moveNumber: i, diverge: move });
      }
    });

    setTranspositionsList(samePositionsList);
  }, [
    activeEvent?.tournamentDetails.schedule.past,
    activeEvent?.tournamentDetails.schedule.present?.gameNr,
    activeGameNumber,
    currentGameData?.fenList,
    fetchReverseFor,
    reverseGameData?.fenList,
    reverseGameData?.moveList,
    setTranspositionsList,
  ]);
};
