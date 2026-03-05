import { useCallback, useEffect, useRef, useState } from "react";
import { Chess960 } from "../chess.js/chess";
import {
  Board as BoardComponent,
  type BoardHandle,
  type BoardProps,
} from "../components/Board";
import { useLiveInfo } from "../context/LiveInfoContext";
import { getLiveInfosForMove } from "../LiveInfo";

export function useLiveBoard({ animated, id }: BoardProps) {
  const boardHandle = useRef<BoardHandle>(null);

  const currentMoveNumber = useLiveInfo((state) => state.currentMoveNumber);
  const liveEngineData = useLiveInfo((state) => state.liveEngineData);
  const currentFen = useLiveInfo((state) => state.currentFen);
  const game = useLiveInfo((state) => state.game);

  const updateBoard = useCallback(
    (bypassRateLimit: boolean = false) => {
      boardHandle.current?.updateBoard(
        game,
        currentMoveNumber,
        getLiveInfosForMove(
          liveEngineData,
          currentMoveNumber,
          game.turnAt(currentMoveNumber)
        ),
        bypassRateLimit
      );
    },
    [game, currentMoveNumber, currentFen, liveEngineData]
  );

  return {
    Board: <BoardComponent id={id} ref={boardHandle} animated={animated} />,
    updateBoard,
    game,
  };
}

export function useKibitzerBoard({ animated, id }: BoardProps) {
  const boardHandle = useRef<BoardHandle>(null);
  const game = useRef(new Chess960());

  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);
  const [currentFen, setCurrentFen] = useState(game.current.fen());

  useEffect(() => {
    setTimeout(() => {
      boardHandle.current?.updateBoard(game.current, currentMoveNumber);
    }, 10);
  }, [currentMoveNumber, currentFen]);

  return {
    Board: <BoardComponent id={id} ref={boardHandle} animated={animated} />,
    game,
    currentMoveNumber,
    setCurrentMoveNumber,
    currentFen,
    setCurrentFen,
  };
}
