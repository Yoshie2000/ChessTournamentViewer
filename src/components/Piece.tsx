import { createElement } from "react";

type PieceProps = { type: string; color: "w" | "b" };

export default function Piece({ type, color }: PieceProps) {
  const chessgroundType =
    { p: "pawn", n: "knight", b: "bishop", r: "rook", q: "queen", k: "king" }[
      type
    ] ?? type;
  const chessgroundColor = { w: "white", b: "black" }[color] ?? color;

  return (
    <div className="cg-wrap">
      {createElement("piece", {
        className: `${chessgroundType} ${chessgroundColor}`,
        style: {
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          backgroundSize: "contain",
          backgroundRepeat: "no-repeat",
        },
      })}
    </div>
  );
}
