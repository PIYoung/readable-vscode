import * as fs from "fs";
import * as vscode from "vscode";
import { IChange, IParsedChange } from "./interfaces";

const highlightDecoratorType = vscode.window.createTextEditorDecorationType(
  // set decoration range behavior
  {
    backgroundColor: "#cea7002D", // don't write file on change, just append to array to commit
    overviewRulerColor: "#cea7002D", // get all decorations function, do it on file load, check if over 10, reset if text change is on one of the comments, store comment ranges somewhere in memory after save
    overviewRulerLane: vscode.OverviewRulerLane.Right,
  }
);

const isInComment = (lineNumber: number, changes: IChange[]) => {};

const updateDecorations = async (changes: IChange[]) => {
  let allRanges: vscode.Range[] = [];

  for (let change of changes) {
    // on did change active text editor update decorations
    allRanges.push(change.range);
    // allRanges.push(
    //   new vscode.Range(
    //     new vscode.Position(change.range[0].line, change.range[0].character),
    //     new vscode.Position(change.range[1].line, change.range[1].character)
    //   )
    // );
  }

  if (!vscode.window.activeTextEditor) {
    return;
  }
  vscode.window.activeTextEditor.setDecorations(
    highlightDecoratorType,
    allRanges
  );
};

const getCurrentChanges = (file: string) => {
  console.log("here");
  const data = fs.readFileSync(file, "utf-8");
  if (!data) {
    return;
  }
  const parsed: IParsedChange[] = JSON.parse(data);
  const changes = toChange(parsed);
  return changes;
};

const toChange = (parsedChanges: IParsedChange[]) => {
  let changes: IChange[] = [];
  for (let change of parsedChanges) {
    if (!change.range[0] || !change.range[1]) {
      continue;
    }
    let range = getRangeFromParsedChange(change);
    changes.push({
      file: change.file,
      function: change.function,
      range: range,
      changesCount: change.changesCount,
    });
  }
  return changes;
};

const getRangeFromParsedChange = (change: IParsedChange) => {
  return new vscode.Range(
    new vscode.Position(change.range[0].line, change.range[0].character),
    new vscode.Position(change.range[1].line, change.range[1].character)
  );
};

const getDocumentTextFromEditor = (e: vscode.TextEditor) => {
  return e.document.getText(
    new vscode.Range(
      // gets all the lines in the document
      new vscode.Position(0, 0),
      new vscode.Position(
        e.document.lineCount,
        e.document.lineAt(e.document.lineCount - 1).lineNumber
      )
    )
  );
};

const getDocumentText = () => {
  if (!vscode.window.activeTextEditor) {
    return null;
  }
  // fix bug in constructor
  return vscode.window.activeTextEditor.document.getText(
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
};

export {
  getCurrentChanges,
  getDocumentTextFromEditor,
  getRangeFromParsedChange,
  updateDecorations,
  getDocumentText,
  isInComment,
};
