import type { DrawShape } from "@lichess-org/chessground/draw";
import type { CCCEngine, CCCLiveInfo } from "../types";
import { v4 as uuidv4 } from "uuid";
import { extractLiveInfoFromInfoString } from "../components/LiveInfo";

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

const EmptyEngineDefinition: CCCEngine = {
  authors: "",
  config: { command: "", options: {}, timemargin: 0 },
  country: "",
  elo: "",
  facts: "",
  flag: "",
  id: "",
  imageUrl: "",
  name: "",
  perf: "",
  points: "",
  rating: "",
  updatedAt: "",
  version: "",
  website: "",
  year: "",
};

export type EngineSettings = {
  hash: number;
  threads: number;
  enableKibitzer: boolean;
};

export class EngineWorker {
  private worker: IEngineWorker;

  public onMessage: ((result: AnalysisResult) => void) | null = null;

  private isSearching: boolean = false;
  private activeFen: string | null = null;
  private latestRequestedFen: string | null = null;

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
    if (!this.worker.isReady()) return;

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

    if (msg.startsWith("bestmove")) {
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
      const parsed = extractLiveInfoFromInfoString(msg, this.activeFen);
      if (parsed) {
        this.onMessage({
          fen: this.activeFen,
          liveInfo: parsed.liveInfo,
          arrow: parsed.arrow,
        });
      }
    }
  }

  private waitForStop(): Promise<void> {
    return new Promise((resolve) => {
      this.stopSignal = () => resolve();
    });
  }

  private post(command: string) {
    this.worker.postMessage(command);
  }

  public terminate() {
    this.post("quit");
    this.worker.terminate();
  }
}
