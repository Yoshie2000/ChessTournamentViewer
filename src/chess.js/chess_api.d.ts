// TypeScript bindings for emscripten-generated code.  Automatically generated at compile time.
interface WasmModule {
}

type EmbindString = ArrayBuffer|Uint8Array|Uint8ClampedArray|Int8Array|string;
export interface ClassHandle {
  isAliasOf(other: ClassHandle): boolean;
  delete(): void;
  deleteLater(): this;
  isDeleted(): boolean;
  // @ts-ignore - If targeting lower than ESNext, this symbol might not exist.
  [Symbol.dispose](): void;
  clone(): this;
}
export interface ChessGame extends ClassHandle {
  hasErr(): boolean;
  getSanMoves(): number;
  getSanMovesEnd(): number;
  reset(_0: EmbindString, _1: boolean): void;
  getErr(): string;
  playMoves(_0: EmbindString): boolean;
  getSanMovesString(): string;
  fenAt(_0: number): string;
  moveAt(_0: number): string;
}

interface EmbindModule {
  ChessGame: {
    new(_0: EmbindString, _1: boolean): ChessGame;
  };
  initChess(): void;
}

export type MainModule = WasmModule & EmbindModule;
export default function MainModuleFactory (options?: unknown): Promise<MainModule>;
