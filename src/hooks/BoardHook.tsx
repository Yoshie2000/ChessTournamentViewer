import { useCallback, useEffect, useRef, useState } from "react";
import { Chess960 } from "../chess.js/chess";
import {
  Board as BoardComponent,
  type BoardHandle,
  type BoardProps,
} from "../components/BoardWindow/Board";
import { useLiveInfo } from "../context/LiveInfoContext";
import { getLiveInfosForMove } from "../LiveInfo";

export function useLiveBoard({ animated, id }: BoardProps) {
  const boardHandle = useRef<BoardHandle>(null);

  const updateBoard = useCallback((bypassRateLimit: boolean = false) => {
    const { game, currentMoveNumber, liveEngineData } = useLiveInfo.getState();

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
  }, []);

  return {
    Board: <BoardComponent id={id} ref={boardHandle} animated={animated} />,
    updateBoard,
  };
}

export function useKibitzerBoard({ animated, id }: BoardProps) {
  const boardHandle = useRef<BoardHandle>(null);
  const game = useRef(new Chess960());

  const [currentMoveNumber, setCurrentMoveNumber] = useState(-1);
  const [currentFen, setCurrentFen] = useState(game.current.fen());

  useEffect(() => {
    setTimeout(() => {
      boardHandle.current?.updateBoard(
        game.current,
        currentMoveNumber,
        undefined,
        true
      );
    }, 10);
  }, [currentMoveNumber, currentFen, boardHandle.current]);

  return {
    Board: <BoardComponent id={id} ref={boardHandle} animated={animated} />,
    game,
    currentMoveNumber,
    setCurrentMoveNumber,
    currentFen,
    setCurrentFen,
  };
}
