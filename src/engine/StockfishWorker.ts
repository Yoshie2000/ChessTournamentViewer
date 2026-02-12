import type { IEngineWorker } from "./EngineWorker";

export class StockfishWorker implements IEngineWorker {
  private worker: Worker;
  private callback: null | ((e: any) => void) = null;

  constructor() {
    this.worker = new Worker("/stockfish-17.1-single-a496a04.js");

    this.worker.onmessage = this.callback;

    this.postMessage("uci");
    this.postMessage("setoption name Hash value 128");
    this.postMessage("isready");
    this.postMessage("ucinewgame");
  }

  public isReady() {
    return true;
  }

  public onError(_: () => void) {}

  public onMessage(callback: (e: any) => void) {
    this.callback = (e) => callback(e.data);
    this.worker.onmessage = this.callback;
  }

  public postMessage(e: any) {
    this.worker.postMessage(e);
  }

  public terminate() {
    this.postMessage("quit");
    this.worker.terminate();
  }
}
