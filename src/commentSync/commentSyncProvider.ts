import * as vscode from "vscode";
import * as child_process from "child_process";
import * as Diff from "diff";
import * as Git from "nodegit";
import * as fs from "fs";
import * as path from "path";
import CodeEditor from "../CodeEditor";
import { IChange, ICommentBounds, IParsedChange } from "./interfaces";
import { getCurrentChanges, isInComment, updateDecorations } from "./utils";
import { getCommentRange, getSymbolFromCommentRange } from "./comments";
export default class CommentSyncProvider {
  private _supportedLanguages = [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact",
    "php",
    "python",
  ];
  private _codeEditor: CodeEditor;
  private _document: string | undefined;
  private _comments: vscode.Range[];
  private _commentsToDelete: vscode.Range[];
  private _path: string | undefined;
  constructor(codeEditor: CodeEditor) {
    this._codeEditor = codeEditor;
    this._document = this.getDocumentText();
    this._comments = [];
    this._commentsToDelete = [];
    // get list of code and comments to that code with that initial diff, then you can check which comments have been edited
    /**
     * So like {
     *   Code {
     *      functionName, all that stuff
     *      Comment: { start, end }
     *    }
     * }
     */
    if (vscode.workspace.workspaceFolders) {
      this._path = vscode.workspace.workspaceFolders[0].uri.path;
    }
    // vscode.workspace.onDidChangeTextDocument((e) => {
    //   // queue up the changes on edit, save them on save
    //   // console.log(e.contentChanges[0].range); // this might be useful
    //   let edit = e.contentChanges[0].range.start.line;
    //   for (let comment of this._comments) {
    //     if (edit >= comment.start.line && edit <= comment.end.line) {
    //       // maybe store comment range so we can calculate that
    //       this._commentsToDelete.push(comment); // get symbol at one plus range end of comment assuming text at range end is */, do a while loop
    //       console.log(comment);
    //     }
    //   }
    // });
    vscode.window.onDidChangeActiveTextEditor(this.onTextEditorChange);
    vscode.workspace.onDidChangeWorkspaceFolders(this.onWorkspaceChange);
    // this doesn't always work
    vscode.workspace.onWillSaveTextDocument(async (e) => {
      // add prompt which asks user if they want to enable comment sync for this project, set global variable in this class
      // TODO: clean up this code to run as least as possible
      if (!vscode.workspace.workspaceFolders) {
        return;
      }
      if (!this._document) {
        return;
      }
      if (!this._supportedLanguages.includes(e.document.languageId)) {
        return;
      }
      let text = this.getDocumentText();
      if (!text) {
        return;
      }

      // here
      let format = this.getDiffLines(this._document, text, e.document.fileName);

      let linesChanged: IChange[] = [];
      let codePosition = 0;
      let symbols = await this._codeEditor.getAllSymbols();

      let path = vscode.workspace.workspaceFolders[0].uri.fsPath;

      // let revision = child_process
      //   .execSync("git -C " + path + " rev-parse HEAD")
      //   .toString()
      //   .trim();
      // for each file changed (I think)
      // but since you can only save one file at a time, just get the first file
      console.log(format);
      if (!format[0].hunks[0]) {
        // use get comment range and compare to see if it's in it
        return;
      }
      codePosition = format[0].hunks[0].newStart; // filter to remove all the non retarded lines
      const lines = format[0].hunks[0].lines;
      for await (let [index, _line] of lines.entries()) {
        if (_line.startsWith("+" || _line.startsWith("-"))) {
          let line = index + codePosition;
          let symbolPosition = new vscode.Position(
            line,
            e.document.lineAt(line).firstNonWhitespaceCharacterIndex // this is throwing an error
          );

          let symbol = await this._codeEditor.getSymbolFromPosition(
            symbols,
            symbolPosition
          );
          if (!symbol) {
            let range = await getCommentRange(line - 1, text.split("\n")); // because we're freaking cool

            if (!range) {
              continue;
            }

            let comment = await getSymbolFromCommentRange(symbols, range); // just delete the comment from the symbol range in sync
            console.log("comemnte edited");
            console.log(comment?.name);
            // get function from comment range
            // check if comment
            continue;
          } // put else here
          // instead of check comment, get comment
          let range = getCommentRange(
            symbol.range.start.line - 2,
            text.split("\n")
          );
          if (!range) {
            continue; // no range
          }
          let fileName = e.document.fileName;

          let idx = linesChanged.findIndex((e) => {
            if (!symbol) {
              return false;
            }
            if (e.file === fileName && e.function === symbol.name) {
              return true;
            } else {
              return false;
            }
          });

          if (idx !== -1) {
            linesChanged[idx].changesCount += 1;
          } else {
            linesChanged.push({
              file: e.document.fileName, // get start line instead of end line
              function: symbol.name,
              range,
              changesCount: 1,
            });
          }
        }
      }

      console.log("lines changing"); // open new folder update decorations from sync file
      console.log(linesChanged);

      this._document = text;
      linesChanged = this.syncWithFileChanges(linesChanged); // add deleted array which runs a filter for the name
      console.log(linesChanged);
      this.writeToFile(linesChanged);
      updateDecorations(linesChanged); // get initial vscode highlight color
      console.log("saving");
    });
  }

  private onTextEditorChange(e: vscode.TextEditor | undefined) {
    console.log("ok");
    if (!e) {
      return;
    }
    if (!this._supportedLanguages.includes(e.document.languageId)) {
      return;
    }
    if (!vscode.workspace.workspaceFolders) {
      return;
    }
    let filePath = path.join(
      vscode.workspace.workspaceFolders[0].uri.fsPath,
      "sync.json"
    );
    this._document = this.getDocumentText(); // get the document text from the editor
    let ranges: vscode.Range[] = [];
    const changes = getCurrentChanges(filePath);
    console.log(changes);
    console.log(changes);
    if (!changes) {
      return;
    }
    updateDecorations(changes);
  }

  private onWorkspaceChange(e: vscode.WorkspaceFoldersChangeEvent) {
    // make work with multiple workspace folders
    this._path = e.added[0].uri.path;
  }

  private getDiffLines(document: string, text1: string, fileName: string) {
    // get the diff between the current document and the new document
    const diff = Diff.diffLines(document, text1, {
      ignoreWhitespace: true,
    });
    const patch = Diff.createPatch(fileName, document, text1);
    let format = Diff.parsePatch(patch);
    return format;
  }

  public syncWithNewChanges(
    changes: IChange[],
    newChanges: IChange[]
  ): IChange[] {
    let allChanges: IChange[] = changes;
    for (let change of newChanges) {
      let index = changes.findIndex((e) => {
        if (e.file === change.file && e.function === change.function) {
          return true;
        } else {
          return false;
        }
      });
      if (index !== -1) {
        allChanges[index].changesCount += change.changesCount; // check if comment is above
        allChanges[index].range = change.range; // update comment range
      } else {
        allChanges.push(change);
      }
    }
    return allChanges;
  }

  /**
   * Comment | null
   * @param symbol
   * @returns comment | null
   */
  public getComment(symbol: vscode.DocumentSymbol): boolean {
    if (symbol.range.start.line - 1 < 0) {
      return false;
    }

    const line = vscode.window.activeTextEditor?.document.lineAt(
      symbol.range.start.line - 1
    ).text;

    if (!line) {
      return false;
    }

    if (line.includes("*/") || line.includes("//")) {
      return true;
    } else {
      return false;
    }
  }

  public getCurrentInfo(sync: string) {
    if (!fs.existsSync(sync)) {
      return [];
    } else {
      return JSON.parse(fs.readFileSync(sync, "utf-8"));
    }
  }

  public syncWithFileChanges(changes: IChange[]) {
    if (vscode.workspace.workspaceFolders) {
      const sync = path.join(
        vscode.workspace.workspaceFolders[0].uri.fsPath,
        "sync.json"
      );
      let fileData: IChange[] | undefined;
      if (!fs.existsSync(sync)) {
        fileData = [];
      } else {
        fileData = getCurrentChanges(sync);
        // fileData = JSON.parse(fs.readFileSync(sync, "utf-8"));
      }
      if (!fileData) {
        fileData = [];
      }
      const allChanges = this.syncWithNewChanges(fileData, changes);
      return allChanges;
    }
    throw new Error("Error: no workspace folders");
  }

  public writeToFile(changes: IChange[]) {
    try {
      if (vscode.workspace.workspaceFolders) {
        const sync = path.join(
          vscode.workspace.workspaceFolders[0].uri.fsPath,
          "sync.json"
        );
        if (!fs.existsSync(sync)) {
          fs.writeFileSync(sync, "[]");
        }
        fs.writeFileSync(sync, JSON.stringify(changes));
        // let fileData;
        // if (!fs.existsSync(sync)) {
        //   fs.writeFileSync(sync, "[]");
        //   fileData = [];
        // } else {
        //   fileData = JSON.parse(fs.readFileSync(sync, "utf-8"));
        // }
        // let updatedChanges = this.syncWithNewChanges(fileData, newChanges);
        // fs.writeFileSync(sync, JSON.stringify(updatedChanges));
        // console.log(updatedChanges);
        // console.log(fileData);
        // console.log(
        //   path.join(
        //     vscode.workspace.workspaceFolders[0].uri.fsPath,
        //     "sync.json"
        //   )
        // );
      }
      // const fileData = fs.readFileSync()
    } catch (err: any) {
      console.log(err);
      vscode.window.showErrorMessage(err);
    }
  }

  private getDocumentText() {
    // fix bug in constructor
    return vscode.window.activeTextEditor?.document.getText(
      new vscode.Range(
        // gets all the lines in the document
        new vscode.Position(0, 0),
        new vscode.Position(
          vscode.window.activeTextEditor.document.lineCount,
          vscode.window.activeTextEditor.document.lineAt(
            vscode.window.activeTextEditor.document.lineCount - 1
          ).lineNumber
        )
      )
    );
  }

  public checkGit() {}

  public async getFunctionName(symbol: vscode.DocumentSymbol) {}
}
