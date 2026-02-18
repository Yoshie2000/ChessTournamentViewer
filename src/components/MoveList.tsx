import { useEffect, useRef } from "react";
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import "./MoveList.css";
import { Chess, Chess960 } from "../chess.js/chess";
import {
  LuClipboard,
  LuClipboardList,
  LuDatabase,
  LuDownload,
} from "react-icons/lu";

type MoveListProps = {
  game: Chess960;
  cccGameId?: string;
  currentMoveNumber: number;
  setCurrentMoveNumber: (moveNumber: number) => void;
  controllers: boolean;
  disagreementMoveIndex?: number;
};

export function getGameAtMoveNumber(game: Chess960, moveNumber: number) {
  if (moveNumber === -1) return game;

  const history = game.history({ verbose: true });
  const headers = game.getHeaders();
  const gameCopy = new Chess960(headers["FEN"] ?? new Chess().fen());

  for (const header of Object.keys(headers)) {
    gameCopy.setHeader(header, headers[header]);
  }
  for (let i = 0; i < moveNumber && i < history.length; i++) {
    gameCopy.move(history[i].san, { strict: false });
  }

  return gameCopy;
}

function moveClass(active: boolean, disagreement: boolean) {
  return (
    "move" +
    (active ? " currentMove" : "") +
    (disagreement ? " disagreementMove" : "")
  );
}

function MoveList({
  game,
  currentMoveNumber,
  setCurrentMoveNumber,
  cccGameId,
  controllers,
  disagreementMoveIndex,
}: MoveListProps) {
  const moves = game.history();
  const moveListRef = useRef<HTMLDivElement>(null);

  const startFen = game.getHeaders()["FEN"];
  const blackMovesFirst = startFen?.split(" ")[1] === "b";
  const pairStart = blackMovesFirst ? 1 : 0;

  useEffect(() => {
    if (controllers) {
      const el = moveListRef.current;
      if (!el || currentMoveNumber !== -1) return;
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }, [moves.length, currentMoveNumber]);

  useEffect(() => {
    if (controllers) {
      const handleKeyDown = (e: KeyboardEvent) => {
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        if (e.key === "ArrowLeft") undoMove();
        else if (e.key === "ArrowRight") redoMove();
        else if (e.key === "ArrowUp") {
          e.preventDefault();
          undoAllMoves();
        } else if (e.key === "ArrowDown") {
          e.preventDefault();
          redoAllMoves();
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [currentMoveNumber, moves.length]);

  function undoAllMoves() {
    setCurrentMoveNumber(0);
    const el = moveListRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = 0;
      });
    }
  }
  function redoAllMoves() {
    setCurrentMoveNumber(-1);
    const el = moveListRef.current;
    if (el) {
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight;
      });
    }
  }
  function undoMove() {
    if (currentMoveNumber === 0) return;
    if (currentMoveNumber === -1) {
      setCurrentMoveNumber(moves.length - 1);
    } else {
      setCurrentMoveNumber(currentMoveNumber - 1);
    }
  }
  function redoMove() {
    if (currentMoveNumber === -1) return;
    if (currentMoveNumber + 1 >= moves.length) {
      setCurrentMoveNumber(-1);
    } else {
      setCurrentMoveNumber(currentMoveNumber + 1);
    }
  }

  async function copyToClipboard(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      return false;
    }
  }

  const currentGame = () => getGameAtMoveNumber(game, currentMoveNumber);
  function copyFen() {
    copyToClipboard(currentGame().fen());
  }
  function copyPgn() {
    copyToClipboard(currentGame().pgn());
  }
  function openChessDB() {
    const url =
      "https://www.chessdb.cn/queryc_en/?" +
      getGameAtMoveNumber(game, currentMoveNumber).fen().replaceAll(" ", "_");
    window.open(url, "_blank");
  }
  function downloadLogs() {
    const url = `https://storage.googleapis.com/chess-1-prod-ccc/gamelogs/game-${cccGameId}.log`;
    window.open(url, "_blank");
  }

  return (
    <div className="movesWindow">
      <div className="moveList" ref={moveListRef}>
        <table className="moveTable">
          <tbody>
            {blackMovesFirst &&
              moves.length > 0 &&
              (() => {
                const active =
                  currentMoveNumber === 1 ||
                  (currentMoveNumber === -1 && moves.length === 1);
                return (
                  <tr>
                    <th
                      className={"move right" + (active ? " currentMove" : "")}
                    >
                      1.
                    </th>
                    <td>...</td>
                    <td>
                      <span
                        className={moveClass(
                          active,
                          disagreementMoveIndex === 0
                        )}
                        onClick={() => setCurrentMoveNumber(1)}
                      >
                        {moves[0]}
                      </span>
                    </td>
                  </tr>
                );
              })()}

            {moves.map((_, i) => {
              if (i < pairStart || (i - pairStart) % 2 !== 0) return null;

              const whiteMove = moves[i];
              const blackMove = moves[i + 1];
              const moveNumber = blackMovesFirst ? (i + 1) / 2 + 1 : i / 2 + 1;
              const isLatest = currentMoveNumber === -1;

              const whiteActive =
                currentMoveNumber === i + 1 ||
                (isLatest && i === moves.length - 1);
              const blackActive =
                currentMoveNumber === i + 2 ||
                (isLatest && i + 1 === moves.length - 1);
              const rowActive = whiteActive;

              return (
                <tr key={i}>
                  <th
                    className={"move right" + (rowActive ? " currentMove" : "")}
                    onClick={() => setCurrentMoveNumber(i + 1)}
                  >
                    {moveNumber}.
                  </th>
                  <td
                    className={moveClass(
                      whiteActive,
                      disagreementMoveIndex === i
                    )}
                    onClick={() => setCurrentMoveNumber(i + 1)}
                  >
                    {whiteMove}
                  </td>
                  <td>
                    {blackMove && (
                      <span
                        className={moveClass(
                          blackActive,
                          disagreementMoveIndex === i + 1
                        )}
                        onClick={() => setCurrentMoveNumber(i + 2)}
                      >
                        {blackMove}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {controllers && (
        <div className="moveButtonsWrapper">
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
          </div>
          <div className="moveButtons">
            <button onClick={copyFen} style={{ fontSize: "1rem" }}>
              <LuClipboard />
            </button>
            <button onClick={copyPgn} style={{ fontSize: "1rem" }}>
              <LuClipboardList />
            </button>
            <button onClick={openChessDB} style={{ fontSize: "1rem" }}>
              <LuDatabase />
            </button>
            {game.getHeaders()["Termination"] && (
              <button onClick={downloadLogs} style={{ fontSize: "1rem" }}>
                <LuDownload />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { MoveList };
