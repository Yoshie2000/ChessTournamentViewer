import { memo } from "react";
import { Chess } from "../chess.js/chess";
import { useEventStore } from "../context/EventContext";
import { useLiveInfo } from "../context/LiveInfoContext";
import { MoveList } from "./MoveList";

const LiveMoveList = memo(() => {
  const cccGame = useEventStore((state) => state.cccGame);

  const game = useLiveInfo((state) => state.game);
  const moves = useLiveInfo((state) => state.moves);
  const currentMoveNumber = useLiveInfo((state) => state.currentMoveNumber);

  const pgnHeaders = game.getHeaders();
  const termination =
    cccGame?.gameDetails?.termination ??
    pgnHeaders["Termination"] ??
    pgnHeaders["TerminationDetails"];
  const result = pgnHeaders["Result"];

  return (
    <MoveList
      startFen={game.getHeaders()["FEN"] ?? new Chess().fen()}
      moves={moves}
      currentMoveNumber={currentMoveNumber}
      setCurrentMoveNumber={useLiveInfo.getState().setCurrentMoveNumber}
      downloadURL={
        termination && result && result !== "*"
          ? `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${cccGame?.gameDetails.gameNr}.log`
          : undefined
      }
      controllers={true}
    />
  );
});

export { LiveMoveList };
