import type { DrawShape } from "@lichess-org/chessground/draw";
import type { CCCEngine, CCCLiveInfo } from "../types";
import { v4 as uuidv4 } from "uuid";
import { EmptyEngineDefinition, extractLiveInfoFromInfoString } from "../LiveInfo";

export interface IEngineWorker {
  isReady(): boolean;
  onMessage(callback: (e: any) => void): void;
  onError(callback: () => void): void;
  postMessage(e: any): void;
  terminate(): void;
}

export type AnalysisResult = {
  fen: string;
  liveInfo: CCCLiveInfo;
  arrow: DrawShape | null;
};

export type EngineSettings = {
  hash: number;
  threads: number;
  enableKibitzer: boolean;
};

export class EngineWorker {
  private worker: IEngineWorker;

  public onMessage: ((result: AnalysisResult) => void) | null = null;

  public terminated: boolean = false;
  public isSearching: boolean = false;
  public activeFen: string | null = null;
  public latestRequestedFen: string | null = null;

  private queue: Promise<void> = Promise.resolve();

  private stopSignal: (() => void) | null = null;

  private engine: CCCEngine = EmptyEngineDefinition;
  private id: string;

  constructor(worker: IEngineWorker) {
    this.id = uuidv4();

    this.worker = worker;
    this.worker.onMessage((e) => this.handleWorkerMessage(e));
    this.worker.onError(() => {
      this.isSearching = false;
    });
  }

  public getEngineInfo() {
    return this.engine;
  }

  public isReady() {
    return this.worker.isReady();
  }

  public getID() {
    return this.id;
  }

  public async stop() {
    if (!this.isSearching) return;

    this.post("stop");
    await this.waitForStop();
  }

  public analyze(fen: string) {
    if (!this.worker.isReady() || this.terminated) return;

    this.latestRequestedFen = fen;

    this.queue = this.queue
      .then(async () => {
        if (this.latestRequestedFen !== fen) {
          return;
        }
        await this.performAnalysis(fen);
      })
      .catch(() => {
        this.isSearching = false;
      });
  }

  private async performAnalysis(fen: string) {
    if (this.isSearching) {
      this.post("stop");
      await this.waitForStop();
    }

    this.activeFen = fen;
    this.post(`position fen ${fen}`);
    this.post("go infinite");
    this.isSearching = true;
  }

  private handleWorkerMessage(msg: any) {
    if (msg.startsWith("id name")) {
      this.engine = {
        ...this.engine,
        name: msg.split("id name ")[1],
        imageUrl: msg.split("id name ")[1].split(" ")[0].toLowerCase(),
      };
    }

    if (msg.startsWith("bestmove") || this.terminated) {
      this.isSearching = false;
      if (this.stopSignal) {
        this.stopSignal();
        this.stopSignal = null;
      }
      return;
    }

    if (
      msg.startsWith("info depth") &&
      !msg.includes("currmove") &&
      this.onMessage &&
      this.activeFen
    ) {
      const parsed = extractLiveInfoFromInfoString(msg, this.activeFen, "green");
      if (parsed) {
        this.onMessage({
          fen: this.activeFen,
          liveInfo: parsed.liveInfo,
          arrow: parsed.arrow,
        });
      }
    }
  }

  private async waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      const previousSignal = this.stopSignal;
      this.stopSignal = () => {
        if (previousSignal) previousSignal();
        resolve();
      };
    });
  }

  private post(command: string) {
    this.worker.postMessage(command);
  }

  public terminate() {
    this.terminated = true;
    this.post("quit");
    this.worker.terminate();
  }
}
