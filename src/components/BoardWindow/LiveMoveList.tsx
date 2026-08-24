import { memo, useState } from "react";
import { Chess } from "../../chess.js/chess";
import { useLiveInfo } from "../../context/LiveInfoContext";
import { MoveList } from "../MoveList";
import { shallow } from "zustand/shallow";
import { useInterval } from "../../hooks/useInterval";

const LiveMoveList = memo(() => {

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

  return (
    <MoveList
      startFen={game.getHeaders()["FEN"] ?? new Chess().fen()}
      moves={moves}
      currentMoveNumber={currentMoveNumber}
      setCurrentMoveNumber={useLiveInfo.getState().setCurrentMoveNumber}
      bookMoves={bookMoves}
      controllers={true}
    />
  );
});

export { LiveMoveList };
