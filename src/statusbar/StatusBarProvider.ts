import * as vscode from "vscode";
import { DETAILED_DESCRIPTION } from "../generation/consts";
import {
  ACCOUNT_DETAIL,
  ACCOUNT_LABEL,
  COMMENT_DETAIL,
  COMMENT_LABEL,
} from "./consts";

export class StatusBarProvider {
  private statusBarState = {
    Loading: "$(clock)  Loading", // useless for now since extension loads in a second
    NoAccount: "$(person-add)  Login",
    Account: "$(person)  Logged In",
    Error: "$(circle-slash)  Error",
    Ready: "$(check)  Ready",
  };

  public quickPickItems: vscode.QuickPickItem[] = [
    // make different quickpick items for each menu
    {
      label: COMMENT_LABEL, // needs rewrite, and then entire file or text or whatever afterwards
      detail: COMMENT_DETAIL, // needs work on rewrite
      picked: true,
    },
    {
      label: ACCOUNT_LABEL,
      detail: ACCOUNT_DETAIL,
    },
    {
      label: "$(alert)  Report a Bug",
      detail: "Open the GitHub repository to report an issue",
    },
  ];

  public commentItems: vscode.QuickPickItem[] = [
    {
      label: "$(file-code)  Recursively comment entire file",
      detail: "Generate comments for each function in file",
      picked: true,
    },
    {
      label: "$(container)  Summary of File",
      detail: "Generate a comment with a summary of what the file does",
    },
  ];

  public myStatusBar: vscode.StatusBarItem;

  constructor() {
    this.myStatusBar = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      1
    );
    this.myStatusBar.command = "commentai.statusBarClicked";
    this.myStatusBar.text = this.statusBarState.Loading;
    this.myStatusBar.show();
    this.loadStatusBar(); // it's ok to not await because this will run on its own
  }

  private async loadStatusBar() {
    this.myStatusBar.text = this.statusBarState.Ready;
    // check user account
    // show any trial notifications
    // index file
  }

  public async showMenu() {
    let selection = await vscode.window.showQuickPick(this.quickPickItems); // then just map through the menus and
    if (selection === undefined) return;
    if (selection.label === COMMENT_LABEL) {
    }
  }

  public async showCommentMenu() {}

  public updateStatusBar() {}
}
