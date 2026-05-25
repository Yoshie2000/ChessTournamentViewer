import type { IEngineWorker, MessageData, MessageEvent } from "./EngineWorker";

export class StockfishWorker implements IEngineWorker {
  private worker: Worker;
  private callback: null | ((e: MessageEvent) => void) = null;

  constructor(
    hash: number = 128,
    threads: number = 1,
    chess960: boolean = false
  ) {
    this.worker = new Worker("/cached-stockfish-worker.js");

    this.worker.onmessage = this.callback;

    this.postMessage("uci");
    this.postMessage("setoption name Hash value " + hash);
    this.postMessage("setoption name Threads value " + threads);
    this.postMessage("setoption name UCI_Chess960 value " + chess960);
    this.postMessage("isready");
    this.postMessage("ucinewgame");
  }

  public isReady() {
    return true;
  }

  public onError() {}

  public onMessage(callback: (e: MessageData) => void) {
    this.callback = (e) => {
      const data =
        typeof e.data === "string"
          ? e.data.replace(" Multithreaded", "")
          : e.data;
      callback(data);
    };
    this.worker.onmessage = this.callback;
  }

  public postMessage(e: unknown) {
    this.worker.postMessage(e);
  }

  public terminate() {
    this.postMessage("quit");
    this.worker.terminate();
  }
}
