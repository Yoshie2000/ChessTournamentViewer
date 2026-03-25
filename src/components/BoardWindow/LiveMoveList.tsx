import { memo, useState } from "react";
import { Chess, Chess960 } from "../../chess.js/chess";
import { useEventStore } from "../../context/EventContext";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { MoveList } from "../MoveList";
import { shallow } from "zustand/shallow";
import { useInterval } from "../../hooks/useInterval";

const LiveMoveList = memo(() => {
  const activeGame = useEventStore((state) => state.activeGame);
  const game = useLiveInfo((state) => state.game);

  const [moves, setMoves] = useState<string[]>([]);
  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);
  const [bookMoves, setBookMoves] = useState(-1);

  useInterval((state) => {
    setCurrentMoveNumber(state.currentMoveNumber);

    setMoves((previous) => {
      if (shallow(previous, state.moves)) return previous;
      return state.moves;
    });

    const bookPlies = Math.min(
      state.liveEngineData.white.liveInfo?.findIndex((liveInfo) => !!liveInfo),
      state.liveEngineData.black.liveInfo?.findIndex((liveInfo) => !!liveInfo)
    );
    setBookMoves(bookPlies);
  });

  const pgnHeaders = game.getHeaders();
  const termination =
    activeGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  let disagreement = -1;
  if (activeGame?.gameDetails.reversePgn) {
    const reverse = new Chess960();
    reverse.loadPgn(activeGame.gameDetails.reversePgn);
    const reverseHistory = reverse.history();
    const history = game.history();

    const minLength = Math.min(history.length, reverseHistory.length);

    disagreement = minLength;
    for (let i = 0; i < minLength; i++) {
      if (history[i] !== reverseHistory[i]) {
        disagreement = i;
        break;
      }
    }
  }

  return (
    <MoveList
      startFen={game.getHeaders()["FEN"] ?? new Chess().fen()}
      moves={moves}
      currentMoveNumber={currentMoveNumber}
      setCurrentMoveNumber={useLiveInfo.getState().setCurrentMoveNumber}
      bookMoves={bookMoves}
      disagreementMoveIndex={disagreement}
      downloadURL={
        termination && result && result !== "*"
          ? `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${activeGame?.gameDetails.gameNr}.log`
          : undefined
      }
      controllers={true}
    />
  );
});

export { LiveMoveList };
