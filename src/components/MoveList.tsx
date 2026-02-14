import { Fragment, memo, useEffect, useRef } from "react";
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import "./MoveList.css";
import { Chess, Chess960 } from "../chess.js/chess";
import { LuClipboard, LuClipboardList, LuDatabase, LuDownload } from "react-icons/lu";

type MoveListProps = {
  game: Chess960;
  cccGameId: number;
  currentMoveNumber: number;
  setCurrentMoveNumber: (moveNumber: number) => void;
};

export function getGameAtMoveNumber(game: Chess960, moveNumber: number) {
  if (moveNumber === -1) return game;

  const history = game.history({ verbose: true });
  const headers = game.getHeaders();
  const gameCopy = new Chess960(game.getHeaders()["FEN"] ?? new Chess().fen());
  for (const header of Object.keys(headers)) {
    gameCopy.setHeader(header, headers[header]);
  }
  for (let i = 0; i < moveNumber; i++) {
    gameCopy.move(history[i].san, { strict: false });
  }

  return gameCopy;
}

const MoveList = memo(
  ({ game, currentMoveNumber, setCurrentMoveNumber, cccGameId }: MoveListProps) => {
    const moves = game.history();
    const moveListRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!moveListRef.current) return;

      moveListRef.current.scrollTop = moveListRef.current.scrollHeight;
    }, [moveListRef.current, moves.length]);

    function undoAllMoves() {
      setCurrentMoveNumber(0);
    }

    function redoAllMoves() {
      setCurrentMoveNumber(-1);
    }

    function undoMove() {
      if (currentMoveNumber === -1)
        setCurrentMoveNumber(game.history().length - 1);
      else setCurrentMoveNumber(currentMoveNumber - 1);
    }

    function redoMove() {
      if (currentMoveNumber + 1 < moves.length)
        setCurrentMoveNumber(currentMoveNumber + 1);
      else setCurrentMoveNumber(-1);
    }

    async function copyToClipboard(value: string) {
      try {
        await navigator.clipboard.writeText(value);
        return true;
      } catch (err) {
        return false;
      }
    }

    function copyFen() {
      copyToClipboard(getGameAtMoveNumber(game, currentMoveNumber).fen());
    }

    function copyPgn() {
      copyToClipboard(getGameAtMoveNumber(game, currentMoveNumber).pgn());
    }

    function openChessDB() {
      const url = "https://www.chessdb.cn/queryc_en/?" + getGameAtMoveNumber(game, currentMoveNumber).fen().replaceAll(" ", "_");
      window.open(url, "_blank")
    }

    function downloadLogs() {
      const url = `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${cccGameId}.log`
      window.open(url, "_blank")
    }

    useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (event.key === "ArrowLeft" && currentMoveNumber !== 0) {
          undoMove();
        } else if (event.key === "ArrowRight" && currentMoveNumber !== -1) {
          redoMove();
        }
      };

      window.addEventListener("keydown", handleKeyDown);

      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [currentMoveNumber, moves.length]);

    return (
      <>
        <div className="moveList" ref={moveListRef}>
          {moves.map((move, i) => {
            const moveClass =
              i + 1 === currentMoveNumber ||
              (currentMoveNumber === -1 && i === moves.length - 1)
                ? " currentMove"
                : "";
            return (
              <Fragment key={i}>
                {i % 2 == 0 ? (
                  <span className={"moveNumber" + moveClass}>
                    {i / 2 + 1}.{" "}
                  </span>
                ) : null}
                <span
                  className={"move" + moveClass}
                  onClick={() => setCurrentMoveNumber(i)}
                >
                  {move}
                </span>
              </Fragment>
            );
          })}
        </div>

        <div className="moveButtons">
          <button onClick={undoAllMoves} disabled={currentMoveNumber === 0}>
            <MdKeyboardDoubleArrowLeft />
          </button>
          <button onClick={undoMove} disabled={currentMoveNumber === 0}>
            <MdKeyboardArrowLeft />
          </button>
          <button onClick={redoMove} disabled={currentMoveNumber === -1}>
            <MdKeyboardArrowRight />
          </button>
          <button onClick={redoAllMoves} disabled={currentMoveNumber === -1}>
            <MdKeyboardDoubleArrowRight />
          </button>
          <button onClick={copyFen} style={{ fontSize: "1rem" }}>
            <LuClipboard />
          </button>
          <button onClick={copyPgn} style={{ fontSize: "1rem" }}>
            <LuClipboardList />
          </button>
          <button onClick={openChessDB} style={{ fontSize: "1rem" }}>
            <LuDatabase />
          </button>
          {game.getHeaders()["Termination"] && <button onClick={downloadLogs} style={{ fontSize: "1rem" }}>
            <LuDownload />
          </button>}
        </div>
      </>
    );
  }
);

export { MoveList };
