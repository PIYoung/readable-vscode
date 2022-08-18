import * as vscode from "vscode";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as child_process from "child_process";
import ReadableLogger from "../Logger";
import { DownloadState } from "./types";
import { DownloadManager } from "./downloadManager";

/**
 * provides a wrapper around the resync executable
 */
export default class Executable {
  private _onExecutableData: vscode.EventEmitter<string[]>;
  private dir: string;
  private bin: string;
  private process?: child_process.ChildProcessWithoutNullStreams;

  constructor(public readonly context: vscode.ExtensionContext) {
    this.dir = context.globalStorageUri.fsPath;
    this.bin = path.join(this.dir, "resync");

    this._onExecutableData = new vscode.EventEmitter<string[]>();
  }

  public get onExecutableData(): vscode.Event<string[]> {
    return this._onExecutableData.event;
  }

  public async checkProject(folderPath: string) {
    return new Promise<void>(async (resolve, reject) => {
      try {
        this.process = child_process.spawn(this.bin, ["-d", folderPath, "-p"]);

        this.process.stdout.on("error", (error) => {
          ReadableLogger.log(error.message);
          return reject(error.message);
        });

        this.process.on("error", (error) => {
          ReadableLogger.log(error.message);
          return reject(error.message);
        });

        this.process.stdout.on("data", (data) => {
          const split = data.toString().split("\n");
          this._onExecutableData.fire(split);
        });

        this.process.stdout.on("end", () => {
          this.process = undefined;
          return resolve();
        });
      } catch (err: any) {
        ReadableLogger.log(err.toString());
        return reject();
      }
    });
  }

  public checkFile() {}

  public kill() {
    this.process?.kill("SIGINT");
    this.process = undefined;
  }

  public getVersion() {}
}