import type { IEngineWorker } from "./EngineWorker";

export class StockfishWorker implements IEngineWorker {
  private worker: Worker;
  private callback: null | ((e: any) => void) = null;

  constructor(hash: number = 128, threads: number = 1) {
    this.worker = new Worker("/stockfish-18.js");

    this.worker.onmessage = this.callback;

    this.postMessage("uci");
    this.postMessage("setoption name Hash value " + hash);
    this.postMessage("setoption name Threads value " + threads);
    this.postMessage("isready");
    this.postMessage("ucinewgame");

    console.log(hash, threads)
  }

  public isReady() {
    return true;
  }

  public onError(_: () => void) {}

  public onMessage(callback: (e: any) => void) {
    this.callback = (e) => {
      const data = e.data.replace(" Multithreaded", "");
      callback(data);
    }
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
