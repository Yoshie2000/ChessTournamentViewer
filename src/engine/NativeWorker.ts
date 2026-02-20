import type { IEngineWorker } from "./EngineWorker";

export class NativeWorker implements IEngineWorker {
  private ws!: WebSocket;
  private ready: boolean = false;
  private shouldTerminate: boolean = false;
  private callback: null | ((e: any) => void) = null;
  private errorCallback: null | (() => void) = null;

  constructor(hash: number = 128, threads: number = 1) {
    this.connect(hash, threads);
  }

  private connect(hash: number, threads: number) {
    this.ws = new WebSocket("ws://localhost:7654");

    this.ws.onopen = () => {
      this.ready = true;
      this.postMessage("stop");
      this.postMessage("uci");
      this.postMessage("setoption name Hash value " + hash);
      this.postMessage("setoption name Threads value " + threads);
      this.postMessage("isready");
      this.postMessage("ucinewgame");

      // Tell the EngineWorker that we are ready to search
      this.callback?.({data: "bestmove 0000"});
    };
    this.ws.onmessage = this.callback;
    this.ws.onerror = () => {
      this.ready = false;
      this.ws.close();
      this.errorCallback?.();
    };
    this.ws.onclose = () => {
      if (this.shouldTerminate) return;
      this.ready = false;
      setTimeout(() => this.connect(hash, threads), 1000);
    };
  }

  public isReady() {
    return this.ready;
  }

  public onError(callback: () => void): void {
    this.errorCallback = () => callback();
  }

  public onMessage(callback: (e: any) => void) {
    this.callback = (e) => callback(e.data);
    this.ws.onmessage = this.callback;
  }

  public postMessage(e: any) {
    if (!this.ready || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(e);
  }

  public terminate() {
    this.shouldTerminate = true;
    this.ready = false;
    this.ws.close();
  }
}
