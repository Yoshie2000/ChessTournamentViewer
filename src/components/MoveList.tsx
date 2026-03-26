import { memo, useEffect, useRef } from "react";
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import "./MoveList.css";
import { Chess960 } from "../chess.js/chess";
import {
  LuClipboard,
  LuClipboardList,
  LuDatabase,
  LuDownload,
} from "react-icons/lu";

type MoveListProps = {
  startFen: string;
  moves: string[];
  downloadURL?: string;
  currentMoveNumber: number;
  moveNumberOffset?: number;
  bookMoves?: number;
  setCurrentMoveNumber: (callback: (previous: number) => number) => void;
  controllers: boolean;
  disagreementMoveIndex?: number;
  transpositions?: number[];
};

export function getGameAtMoveNumber(
  fen: string,
  moves: string[],
  moveNumber: number
) {
  const game = new Chess960(fen);

  for (
    let i = 0;
    (i < moveNumber || moveNumber === -1) && i < moves.length;
    i++
  ) {
    game.move(moves[i], { strict: false });
  }
  return game;
}

function moveClass(active: boolean, disagreement: boolean, bookMove: boolean) {
  return (
    "move" +
    (active ? " currentMove" : "") +
    (disagreement ? " disagreementMove" : "") +
    (bookMove ? " bookMove" : "")
  );
}

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

const MoveList = memo(
  ({
    startFen,
    moves,
    currentMoveNumber,
    setCurrentMoveNumber,
    downloadURL,
    controllers,
    disagreementMoveIndex,
    moveNumberOffset = 0,
    bookMoves = -1,
    transpositions,
  }: MoveListProps) => {
    const moveListRef = useRef<HTMLDivElement>(null);

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

    function undoAllMoves() {
      setCurrentMoveNumber(() => 0);
      const el = moveListRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = 0;
        });
      }
    }
    function redoAllMoves() {
      setCurrentMoveNumber(() => -1);
      const el = moveListRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }
    function undoMove() {
      if (currentMoveNumber === 0) return;

      setCurrentMoveNumber((previous) => {
        if (previous === 0) return previous;
        if (previous === -1) return moves.length - 1;
        return previous - 1;
      });
    }
    function redoMove() {
      if (currentMoveNumber === -1) return;

      setCurrentMoveNumber((previous) => {
        if (previous === -1) return previous;
        if (previous + 1 >= moves.length) return -1;
        return previous + 1;
      });
    }

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

    function copyFen() {
      copyToClipboard(
        getGameAtMoveNumber(startFen, moves, currentMoveNumber).fen()
      );
    }
    function copyPgn() {
      copyToClipboard(
        getGameAtMoveNumber(startFen, moves, currentMoveNumber).pgn()
      );
    }
    function openChessDB() {
      const url =
        "https://www.chessdb.cn/queryc_en/?" +
        getGameAtMoveNumber(startFen, moves, currentMoveNumber)
          .fen()
          .replaceAll(" ", "_");
      window.open(url, "_blank");
    }
    function downloadLogs() {
      window.open(downloadURL, "_blank");
    }

    const rows = [];
    for (let i = pairStart; i < moves.length; i += 2) {
      const whiteMove = moves[i];
      const blackMove = moves[i + 1];
      const moveNumber =
        moveNumberOffset + (blackMovesFirst ? (i + 1) / 2 + 1 : i / 2 + 1);
      const isLatest = currentMoveNumber === -1;

      const whiteActive =
        currentMoveNumber === i + 1 || (isLatest && i === moves.length - 1);
      const blackActive =
        currentMoveNumber === i + 2 || (isLatest && i + 1 === moves.length - 1);

      rows.push(
        <MoveRow
          key={i}
          moveIndex={i}
          moveNumber={moveNumber}
          whiteMove={whiteMove}
          blackMove={blackMove}
          whiteActive={whiteActive}
          blackActive={blackActive}
          disagreementWhite={disagreementMoveIndex === i}
          disagreementBlack={disagreementMoveIndex === i + 1}
          bookMoveWhite={i < bookMoves}
          bookMoveBlack={i + 1 < bookMoves}
          setCurrentMoveNumber={setCurrentMoveNumber}
          whiteAgree={transpositions?.includes(i + 1) ?? false}
          blackAgree={transpositions?.includes(i + 2) ?? false}
        />
      );
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
                        className={
                          "move right" + (active ? " currentMove" : "")
                        }
                      >
                        {1 + moveNumberOffset}.
                      </th>
                      <td>...</td>
                      <td>
                        <span
                          className={moveClass(
                            active,
                            disagreementMoveIndex === 0,
                            false
                          )}
                          onClick={() => setCurrentMoveNumber(() => 1)}
                        >
                          {moves[0]}
                        </span>
                      </td>
                    </tr>
                  );
                })()}

              {rows}
            </tbody>
          </table>
        </div>

        {controllers && (
          <div className="moveButtonsWrapper">
            <div className="moveButtons">
              <button
                onClick={undoAllMoves}
                disabled={currentMoveNumber === 0}
                title="Go to start (↑)"
              >
                <MdKeyboardDoubleArrowLeft />
              </button>
              <button
                onClick={undoMove}
                disabled={currentMoveNumber === 0}
                title="Previous move (←)"
              >
                <MdKeyboardArrowLeft />
              </button>
              <button
                onClick={redoMove}
                disabled={currentMoveNumber === -1}
                title="Next move (→)"
              >
                <MdKeyboardArrowRight />
              </button>
              <button
                onClick={redoAllMoves}
                disabled={currentMoveNumber === -1}
                title="Go to end (↓)"
              >
                <MdKeyboardDoubleArrowRight />
              </button>
            </div>
            <div className="moveButtons">
              <button
                onClick={copyFen}
                style={{ fontSize: "1rem" }}
                title="Copy FEN to clipboard"
              >
                <LuClipboard />
              </button>
              <button
                onClick={copyPgn}
                style={{ fontSize: "1rem" }}
                title="Copy PGN to clipboard"
              >
                <LuClipboardList />
              </button>
              <button
                onClick={openChessDB}
                style={{ fontSize: "1rem" }}
                title="Analyse on ChessDB"
              >
                <LuDatabase />
              </button>
              {downloadURL && (
                <button
                  onClick={downloadLogs}
                  style={{ fontSize: "1rem" }}
                  title="Download logs"
                >
                  <LuDownload />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }
);

type MoveRowProps = {
  moveIndex: number;
  moveNumber: number;
  whiteMove: string;
  blackMove: string;
  whiteActive: boolean;
  blackActive: boolean;
  disagreementWhite: boolean;
  disagreementBlack: boolean;
  bookMoveWhite: boolean;
  bookMoveBlack: boolean;
  setCurrentMoveNumber: (callback: (n: number) => number) => void;
  whiteAgree?: boolean;
  blackAgree?: boolean;
};

const MoveRow = memo(
  ({
    moveIndex,
    moveNumber,
    whiteMove,
    blackMove,
    whiteActive,
    blackActive,
    disagreementWhite,
    disagreementBlack,
    bookMoveWhite,
    bookMoveBlack,
    whiteAgree = false,
    blackAgree = false,
    setCurrentMoveNumber,
  }: MoveRowProps) => {
    return (
      <tr>
        <th
          className={
            "move right " +
            moveClass(whiteActive, disagreementWhite, bookMoveWhite)
          }
          onClick={() => setCurrentMoveNumber(() => moveIndex + 1)}
        >
          {moveNumber}.
        </th>
        <td
          className={
            moveClass(whiteActive, disagreementWhite, bookMoveWhite) +
            ` ${whiteAgree ? "agree" : ""}`
          }
          onClick={() => setCurrentMoveNumber(() => moveIndex + 1)}
        >
          {whiteMove}
        </td>
        <td>
          {blackMove && (
            <span
              className={
                moveClass(blackActive, disagreementBlack, bookMoveBlack) +
                ` ${blackAgree ? "agree" : ""}`
              }
              onClick={() => setCurrentMoveNumber(() => moveIndex + 2)}
            >
              {blackMove}
            </span>
          )}
        </td>
      </tr>
    );
  }
);

export { MoveList };
