import { memo, useCallback, useEffect, useRef, type ReactElement } from "react";
import {
  MdKeyboardArrowLeft,
  MdKeyboardArrowRight,
  MdKeyboardDoubleArrowLeft,
  MdKeyboardDoubleArrowRight,
} from "react-icons/md";
import "./MoveList.css";
import { Chess960 } from "../chess.js/chess";
import { LuClipboard, LuClipboardList, LuDatabase } from "react-icons/lu";
import { Button } from "@douyinfe/semi-ui";
import { useLiveInfo } from "@/context/LiveInfoContext";
import LogDownloadButton from "./BoardWindow/LogDownloadButton";
import { getTimeControl } from "@/LiveInfo";
import { useShallow } from "zustand/shallow";
import Piece from "./Piece";

type MoveListProps = {
  startFen: string;
  moves: string[];
  currentMoveNumber: number;
  moveNumberOffset?: number;
  bookMoves?: number;
  setCurrentMoveNumber: (callback: (previous: number) => number) => void;
  controllers: boolean;
  disagreementMoveIndex?: number;
};

function getGameAtMoveNumber(fen: string, moves: string[], moveNumber: number) {
  const game = new Chess960(fen);

  for (
    let i = 0;
    (i < moveNumber || moveNumber === -1) && i < moves.length;
    i++
  ) {
    if (!game.moves().includes(moves[i])) break;
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
    controllers,
    disagreementMoveIndex,
    moveNumberOffset = 0,
    bookMoves = -1,
  }: MoveListProps) => {
    const moveListRef = useRef<HTMLDivElement>(null);

    const timeControl = JSON.parse(
      useLiveInfo((state) => JSON.stringify(getTimeControl(state.game)))
    ) as ReturnType<typeof getTimeControl>;

    const materialBalance = useLiveInfo(
      useShallow((state) => {
        const pieces = new Chess960(state.currentFen)
          .board()
          .flat()
          .filter((x) => !!x);

        const whitePieceAdvantage = new Map<string, number>();
        for (const piece of pieces) {
          if (piece.color === "w") {
            whitePieceAdvantage.set(
              piece.type,
              (whitePieceAdvantage.get(piece.type) ?? 0) + 1
            );
          } else {
            whitePieceAdvantage.set(
              piece.type,
              (whitePieceAdvantage.get(piece.type) ?? 0) - 1
            );
          }
        }

        const result: Record<string, number> = {};
        for (const piece of whitePieceAdvantage.keys()) {
          if (!whitePieceAdvantage.get(piece)) {
            whitePieceAdvantage.delete(piece);
          } else {
            result[piece] = whitePieceAdvantage.get(piece)!;
          }
        }

        return result;
      })
    );
    const halfMoves = useLiveInfo((state) =>
      new Chess960(state.currentFen).getHalfMoves()
    );

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
    }, [moves.length, currentMoveNumber, controllers]);

    const undoAllMoves = useCallback(() => {
      setCurrentMoveNumber(() => 0);
      const el = moveListRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = 0;
        });
      }
    }, [setCurrentMoveNumber]);
    const redoAllMoves = useCallback(() => {
      setCurrentMoveNumber(() => -1);
      const el = moveListRef.current;
      if (el) {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight;
        });
      }
    }, [setCurrentMoveNumber]);
    const undoMove = useCallback(() => {
      if (currentMoveNumber === 0) return;

      setCurrentMoveNumber((previous) => {
        if (previous === 0) return previous;
        if (previous === -1) return moves.length - 1;
        return previous - 1;
      });
    }, [currentMoveNumber, moves.length, setCurrentMoveNumber]);
    const redoMove = useCallback(() => {
      if (currentMoveNumber === -1) return;

      setCurrentMoveNumber((previous) => {
        if (previous === -1) return previous;
        if (previous + 1 >= moves.length) return -1;
        return previous + 1;
      });
    }, [currentMoveNumber, moves.length, setCurrentMoveNumber]);

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
    }, [
      currentMoveNumber,
      moves.length,
      controllers,
      redoAllMoves,
      undoAllMoves,
      undoMove,
      redoMove,
    ]);

    function copyFen() {
      copyToClipboard(
        getGameAtMoveNumber(startFen, moves, currentMoveNumber).fen()
      );
    }
    function copyPgn() {
      const game = getGameAtMoveNumber(startFen, moves, currentMoveNumber);
      const currentHeaders = useLiveInfo.getState().game.getHeaders();
      for (const header of Object.keys(currentHeaders)) {
        game.setHeader(header, currentHeaders[header]);
      }

      copyToClipboard(game.pgn());
    }
    const chessdbURL = controllers
      ? "https://www.chessdb.cn/queryc_en/?" +
        getGameAtMoveNumber(startFen, moves, currentMoveNumber)
          .fen()
          .replaceAll(" ", "_")
      : "";

    function formatToNonzeroDigit(number: number, maxDigits: number = 2) {
      let n = maxDigits;
      let result = number.toFixed(n);
      while (result.endsWith("0") && n > 0) {
        result = number.toFixed(--n);
      }
      return result;
    }

    // TC
    const asymmetricTC =
      JSON.stringify(timeControl.tcW) !== JSON.stringify(timeControl.tcB);
    const tcWhiteString = `${formatToNonzeroDigit(timeControl.tcW.tcBase / 1000)}+${formatToNonzeroDigit(timeControl.tcW.tcIncrement / 1000)}`;
    const tcBlackString = `${formatToNonzeroDigit(timeControl.tcB.tcBase / 1000)}+${formatToNonzeroDigit(timeControl.tcB.tcIncrement / 1000)}`;

    return (
      <div className="movesWindow">
        {controllers && (
          <>
            <div className="gameInformation">
              <div className="timeControl">
                {asymmetricTC ? (
                  <span>
                    {tcWhiteString} / {tcBlackString}
                  </span>
                ) : (
                  <span>{tcBlackString}</span>
                )}
              </div>

              <div className="fiftyMoveRule">{halfMoves}</div>

              <div className="pieceDelta">
                {Object.keys(materialBalance)
                  .map((piece) => {
                    const value = materialBalance[piece];
                    const count = Math.abs(value);
                    const color = value > 0 ? "b" : "w";

                    return Array.from({ length: count }, (_, i) => (
                      <Piece key={i} type={piece} color={color} />
                    ));
                  })
                  .flat()}
              </div>
            </div>
            <hr />
          </>
        )}

        <div className="moveList" ref={moveListRef}>
          {blackMovesFirst && moves.length > 0 && (
            <div className="moveRow subgrid">
              <span className="moveNumber">{1 + moveNumberOffset}.</span>
              <span className="movePlaceholder">...</span>
              <span
                className={moveClass(
                  currentMoveNumber === 1,
                  disagreementMoveIndex === 0,
                  false
                )}
                onClick={() => setCurrentMoveNumber(() => 1)}
              >
                {moves[0]}
              </span>
            </div>
          )}

          {moves.reduce((acc, _, i) => {
            if (i % 2 === 0) {
              const idx = i + pairStart;
              const moveNumber =
                moveNumberOffset +
                Math.round(blackMovesFirst ? (idx + 1) / 2 + 1 : idx / 2 + 1);

              const whiteMove = moves[idx];
              const blackMove = moves[idx + 1];

              const isLatest = currentMoveNumber === -1;

              const whiteActive =
                currentMoveNumber === idx + 1 ||
                (isLatest && idx === moves.length - 1);
              const blackActive =
                currentMoveNumber === idx + 2 ||
                (isLatest && idx + 1 === moves.length - 1);

              acc.push(
                <MoveRow
                  key={idx}
                  moveIndex={idx}
                  moveNumber={moveNumber}
                  whiteMove={whiteMove}
                  blackMove={blackMove}
                  whiteActive={whiteActive}
                  blackActive={blackActive}
                  disagreementWhite={disagreementMoveIndex === idx}
                  disagreementBlack={disagreementMoveIndex === idx + 1}
                  bookMoveWhite={idx < bookMoves}
                  bookMoveBlack={idx + 1 < bookMoves}
                  setCurrentMoveNumber={setCurrentMoveNumber}
                />
              );
            }
            return acc;
          }, [] as ReactElement[])}
        </div>

        {controllers && (
          <>
            <hr />
            <div className="moveButtonsWrapper">
              <div className="moveButtons">
                <Button
                  onClick={undoAllMoves}
                  disabled={currentMoveNumber === 0}
                  title="Go to start (↑)"
                >
                  <MdKeyboardDoubleArrowLeft />
                </Button>
                <Button
                  onClick={undoMove}
                  disabled={currentMoveNumber === 0}
                  title="Previous move (←)"
                >
                  <MdKeyboardArrowLeft />
                </Button>
                <Button
                  onClick={redoMove}
                  disabled={currentMoveNumber === -1}
                  title="Next move (→)"
                >
                  <MdKeyboardArrowRight />
                </Button>
                <Button
                  onClick={redoAllMoves}
                  disabled={currentMoveNumber === -1}
                  title="Go to end (↓)"
                >
                  <MdKeyboardDoubleArrowRight />
                </Button>
              </div>
              <div className="moveButtons moveButtonsSmall">
                <Button onClick={copyFen} title="Copy FEN to clipboard">
                  <LuClipboard />
                </Button>
                <Button onClick={copyPgn} title="Copy PGN to clipboard">
                  <LuClipboardList />
                </Button>
                <a href={chessdbURL} target="_blank">
                  <Button title="Analyse on ChessDB">
                    <LuDatabase />
                  </Button>
                </a>
                <LogDownloadButton />
              </div>
            </div>
          </>
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
    setCurrentMoveNumber,
  }: MoveRowProps) => {
    return (
      <div className="moveRow">
        <span
          className="moveNumber"
          onClick={() => setCurrentMoveNumber(() => moveIndex + 1)}
        >
          {moveNumber}.
        </span>
        <span
          className={moveClass(whiteActive, disagreementWhite, bookMoveWhite)}
          onClick={() => setCurrentMoveNumber(() => moveIndex + 1)}
        >
          {whiteMove}
        </span>
        {blackMove && (
          <span
            className={moveClass(blackActive, disagreementBlack, bookMoveBlack)}
            onClick={() => setCurrentMoveNumber(() => moveIndex + 2)}
          >
            {blackMove}
          </span>
        )}
      </div>
    );
  }
);

export { MoveList };
