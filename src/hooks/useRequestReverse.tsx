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
  const waitingSet = useGameHistory((state) => state.waitingSet);

  const gameDataMap = useGameHistory((state) => state.gameDataMap);
  const setTranspositionsList = useGameHistory(
    (state) => state.setTranspositions
  );

  useEffect(() => {
    if (!activeGameNumber) {
      return;
    }

    useGameHistory
      .getState()
      .setDataForGame(Number(activeGameNumber), game.boardFenHistory());
  }, [activeGameNumber, game]);

  useEffect(() => {
    const fetchReverse = async (gameNumber: number) => {
      try {
        const reverseData = await fetchReverseFor(gameNumber);

        if (!reverseData) {
          return;
        }
        const { pgn, reverseGameNumber } = reverseData;

        const chess = new Chess960();
        chess.loadPgn(pgn);

        const histories = chess.boardFenHistory();

        useGameHistory.getState().setDataForGame(reverseGameNumber, histories);
      } catch (err) {
        console.log(err);
        return;
      }
    };

    const handleStuff = async () => {
      const firstGameNumberOfTheEvent: number | null =
        Number(activeEvent?.tournamentDetails.schedule.past[0].gameNr) ||
        Number(activeEvent?.tournamentDetails.schedule.present?.gameNr) ||
        null;

      if (!activeGameNumber || !firstGameNumberOfTheEvent) {
        return;
      }

      const isFirstGameNumberEven = firstGameNumberOfTheEvent % 2 === 0;
      const isCurrentGameNumberEven = activeGameNumber % 2 === 0;

      const direction = isFirstGameNumberEven ? 1 : -1;
      const reverseGameNumber =
        activeGameNumber + (isCurrentGameNumberEven ? direction : -direction);

      const currentFenList = gameDataMap[activeGameNumber]?.fenList;
      const reverseGameFenList = gameDataMap[reverseGameNumber]?.fenList;
      const reverseGameMoveList = gameDataMap[reverseGameNumber]?.moveList;

      if (
        !waitingSet.has(reverseGameNumber) &&
        (!reverseGameFenList || !reverseGameMoveList)
      ) {
        useGameHistory.getState().setWaiting(reverseGameNumber);

        await fetchReverse(Number(activeGameNumber));
        return;
      }

      if (!currentFenList) {
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

      setTranspositionsList(activeGameNumber, samePositionsList);
    };

    handleStuff();
  }, [
    activeEvent?.tournamentDetails.schedule.past,
    activeEvent?.tournamentDetails.schedule.present?.gameNr,
    activeGameNumber,
    fetchReverseFor,
    gameDataMap,
    setTranspositionsList,
    waitingSet,
  ]);
};
