// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
// import "isomorphic-fetch";
import * as vscode from "vscode";
import { CodeCommentAuthenticationProvider } from "./authentication/AuthProvider";
import CommentSyncProvider from "./commentSync/commentSyncProvider";
import CodeEditor from "./CodeEditor";
import { provideComments, provideDocstring } from "./completion/Completion";
import TrialHelper from "./trial/TrialHelper";
import { loginOptions, registerOptions } from "./authentication/Prompts";
import { emailLogin } from "./authentication/EmailLogin";
import { githubLogin } from "./authentication/GitHubLogin";
import { checkAccount, register, resetPassword } from "./authentication/Misc";
import { StatusBarProvider } from "./statusBar/StatusBarProvider";
import { generateAutoComplete, generateDocstring } from "./completion/generate";
import { getSafeRange, newFormatText } from "./completion/utils";
import { createSelection, removeSelections } from "./selectionTools";
import { SidebarProvider } from "./sideBar/sidebarProvider";
import { getCommentFromLine } from "./completion/formatUtils";

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

export async function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "Readable" is now active!');

  // Get the password for the readable account, if it exists, and if it doesn't, prompt the user for it.
  const status = new StatusBarProvider();
  let editor = vscode.window.activeTextEditor;
  let pass = await context.secrets.get("readable:password");

  const isEnabled = () => {
    // check if the extension is enabled
    return vscode.workspace
      .getConfiguration("readable")
      .get<boolean>("enableAutoComplete");
  };

  const sidebarProvider = new SidebarProvider(context.extensionUri);

  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      "readable-sidebar",
      sidebarProvider
    )
  );

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      [{ language: "python" }],
      {
        async provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          if (!isEnabled()) {
            return;
          }
          const linePrefix = document
            .lineAt(position)
            .text.substring(0, position.character);

          const line = document.lineAt(position).text;

          try {
            if (
              linePrefix.includes("#") &&
              position.character > line.trimLeft().indexOf("#")
            ) {
              return new Promise<vscode.CompletionItem[] | undefined>(
                async (resolve, reject) => {
                  let updatedText =
                    vscode.window.activeTextEditor?.document.lineAt(
                      position
                    ).text;
                  if (updatedText === line) {
                    let comment = await provideComments(
                      position,
                      document,
                      "python"
                    );
                    resolve(comment);
                  } else {
                    resolve(undefined);
                  }
                }
              );
            } else {
              return undefined;
            }
          } catch (err: any) {
            console.log(err);
          }
        },
      },
      " ",
      ","
    ),

    vscode.languages.registerCompletionItemProvider(
      [
        { language: "javascript" },
        { language: "typescript" },
        { language: "cpp" },
        { language: "csharp" },
        { language: "php" },
        { language: "java" },
        { language: "javascriptreact" },
        { language: "typescriptreact" },
        { language: "php" },
      ],
      {
        async provideCompletionItems(
          document: vscode.TextDocument,
          position: vscode.Position,
          token: vscode.CancellationToken,
          context: vscode.CompletionContext
        ) {
          let isEnabled = vscode.workspace // get the configuration
            .getConfiguration("readable")
            .get<boolean>("enableAutoComplete");
          if (!isEnabled || TrialHelper.TrialEnded) {
            return;
          }

          const linePrefix = document // get the line prefix
            .lineAt(position)
            .text.substring(0, position.character);

          const line = document.lineAt(position).text;

          try {
            if (
              line.includes("//") &&
              position.character > line.trimLeft().indexOf("//")
            ) {
              return new Promise<vscode.CompletionItem[] | undefined>(
                async (resolve, reject) => {
                  let updatedText =
                    vscode.window.activeTextEditor?.document.lineAt(
                      position
                    ).text;
                  let language = codeEditor.getLanguageId();
                  if (updatedText === line) {
                    let comment = await provideComments(
                      position,
                      document,
                      language
                    );
                    resolve(comment);
                  } else {
                    resolve(undefined);
                  }
                }
              );
            } else {
              return undefined;
            }
          } catch (err: any) {
            console.log(err);
            vscode.window.showErrorMessage(err.message);
          }
        },
      },
      " ",
      ","
    ),

    // vscode.languages.registerCompletionItemProvider(
    //   [
    //     { language: "javascript" },
    //     { language: "typescript" },
    //     { language: "cpp" },
    //     { language: "csharp" },
    //     { language: "php" },
    //     { language: "java" },
    //     { language: "javascriptreact" },
    //     { language: "typescriptreact" },
    //     { language: "php" },
    //   ],
    //   {
    //     async provideCompletionItems(document, position, token, context) {
    //       let isEnabled = vscode.workspace // get the configuration
    //         .getConfiguration("readable")
    //         .get<boolean>("enableAutoComplete");
    //       if (!isEnabled || TrialHelper.TrialEnded) {
    //         return;
    //       }

    //       const linePrefix = document // get the line prefix
    //         .lineAt(position)
    //         .text.substring(0, position.character);

    //       if (!linePrefix.endsWith("/**")) {
    //         return undefined;
    //       }
    //       let language = codeEditor.getLanguageId();
    //       return await provideDocstring(position, document, language);
    //     },
    //   },
    //   "*"
    // ),

    // vscode.languages.registerCompletionItemProvider(
    //   [{ language: "python" }],
    //   {
    //     async provideCompletionItems(document, position, token, context) {
    //       const isEnabled = vscode.workspace
    //         .getConfiguration("readable")
    //         .get<boolean>("enableAutoComplete");
    //       if (!isEnabled || TrialHelper.TrialEnded) {
    //         return;
    //       }

    //       const linePrefix = document
    //         .lineAt(position)
    //         .text.substring(0, position.character);

    //       if (!linePrefix.endsWith('"""')) {
    //         return;
    //       }

    //       try {
    //         return await provideDocstring(position, document, "python");
    //       } catch (err: any) {
    //         console.log(err);
    //         vscode.window.showErrorMessage(err.message);
    //       }

    //       return undefined;
    //     },
    //   },
    //   '"'
    // ),
    vscode.commands.registerCommand("readable.insertComment", async (args) => {
      vscode.window.withProgress(
        {
          title: "Readable: Generating an Inline Comment",
          location: vscode.ProgressLocation.Notification,
          cancellable: true,
        },
        (progress, token) => {
          const p = new Promise<void>(async (resolve, reject) => {
            try {
              const position = args.cursor as vscode.Position;
              const document = args.document as vscode.TextDocument;
              const session = await vscode.authentication.getSession(
                CodeCommentAuthenticationProvider.id,
                [],
                { createIfNone: false }
              );

              if (!session) {
                vscode.window.showErrorMessage("Readable: Please log in");
                resolve();
                return;
              }

              let codeSymbol = await codeEditor.getOrCreateSymbolUnderCursor(
                args.cursor,
                document.lineCount
              );

              if (!codeSymbol) {
                // show an error
                resolve();
                return;
              }

              let { startLine, endLine } = getSafeRange(
                args.cursor.line,
                codeSymbol.range.start.line,
                codeSymbol.range.end.line,
                document.lineCount
              );

              let code = await codeEditor.getTextInRange(
                new vscode.Range(
                  new vscode.Position(startLine, 0),
                  new vscode.Position(
                    endLine,
                    document.lineAt(endLine).range.end.character
                  )
                )
              );

              const line = document.lineAt(position).text;
              const comment = getCommentFromLine(line, document.languageId);

              console.log(args);
              if (token.isCancellationRequested) {
                resolve();
                return;
              }
              let fullCode = code;
              if (args.language === "python") {
                let fullCodeSplit = fullCode.split("\n");
                fullCodeSplit.map((line: any) => {
                  if (line.includes("#")) {
                    fullCode += line.substring(0, line.indexOf("#") + 1) + "\n";
                  } else {
                    fullCode += line + "\n";
                  }
                });
              }
              let data = await generateAutoComplete(
                fullCode,
                // args.fullCode,
                comment,
                document.languageId,
                session.accessToken
              );

              if (token.isCancellationRequested) {
                resolve();
                return;
              }
              if (
                data.trim() === "" ||
                data.includes("<--") ||
                data.includes("TODO")
              ) {
                // No comment was generated.
                let result = vscode.window.showWarningMessage(
                  "No comment was able to be generated."
                );
                resolve();
                return;
              }

              if (token.isCancellationRequested) {
                resolve();
                return;
              }
              await codeEditor.insertTextAtPosition(data.trim(), args.cursor);
              console.log("inserted comment");
              resolve();
            } catch (err: any) {
              if (err.message) {
                vscode.window.showErrorMessage("An error has occurred");
                vscode.window.showErrorMessage(err.message);
              }
              resolve();
              console.log(err);
            }
          });
          return p;
        }
      );
    }),

    vscode.commands.registerCommand("readable.rightClickComment", async () => {
      // a test comment
      const session = await vscode.authentication.getSession(
        CodeCommentAuthenticationProvider.id,
        [],
        { createIfNone: false }
      );
      if (!session) {
        vscode.window.showErrorMessage("Readable: Please log in");
        return;
      }
      vscode.window.withProgress(
        {
          title: "Readable: Generating Docstring...",
          location: vscode.ProgressLocation.Notification,
          cancellable: false,
        },
        (progress, token) => {
          let p = new Promise<void>(async (resolve, reject) => {
            if (!vscode.window.activeTextEditor) {
              vscode.window.showErrorMessage(
                "Error: failed to get active text editor"
              );
              resolve();
              return;
            }
            try {
              let _position = 0;
              let codeSpaces = 0;
              let fullCode;
              let language = codeEditor.getLanguageId();
              if (codeEditor.hasSelection()) {
                fullCode = codeEditor.getSelectedText(); // split by \n and then check for out of range, and make codeSpaces the first line of the selection
                const selection = codeEditor.getSelection();
                _position = selection.start.line - 1;
                codeSpaces = codeEditor.getSpacesFromLine(selection.start.line);
              } else {
                const position = codeEditor.getCursor();
                let symbol = await codeEditor.getSymbolUnderCusor(position);
                if (!symbol) {
                  vscode.window.showErrorMessage(
                    "Error: Failed to find function. Highlight function instead."
                  );
                  resolve();
                  return;
                }
                const startCharacter =
                  vscode.window.activeTextEditor.document.lineAt(
                    symbol.range.start.line
                  ).firstNonWhitespaceCharacterIndex;

                const selectionRange = new vscode.Range(
                  new vscode.Position(symbol.range.start.line, startCharacter),
                  new vscode.Position(
                    symbol.range.end.line,
                    symbol.range.end.character
                  )
                );

                await createSelection(selectionRange);
                setTimeout(async () => {
                  await removeSelections();
                }, 200);
                fullCode = await codeEditor.getFirstAndLastText(symbol);
                codeSpaces = codeEditor.getSpacesFromLine(
                  symbol.range.start.line
                );
                console.log(codeSpaces);
                _position = symbol.range.start.line - 1; // TODO: check for line count
                console.log(codeSpaces);
                // fullCode = await codeEditor.getTextFromSymbol(symbol);
                // console.log(fullCode);
              }
              let docstring = await generateDocstring(
                fullCode,
                language,
                "",
                session.accessToken
              );
              console.log(docstring);
              let newFormattedText = newFormatText(
                docstring,
                codeSpaces,
                language
              );
              console.log(newFormattedText);
              codeEditor.insertTextAtPosition(
                newFormattedText,
                new vscode.Position(
                  language === "python" ? _position + 2 : _position + 1,
                  0
                )
              );
              resolve();
            } catch (err: any) {
              if (err.message) {
                vscode.window.showErrorMessage(err.message);
              }
              resolve();
            }
          });
          return p;
        }
      );
    })
  );

  const codeEditor = new CodeEditor(editor);
  // if (vscode.workspace.name) {
  //   const dbTools = new DatabaseTools(
  //     context.globalState,
  //     vscode.workspace.name
  //   );
  // }
  let authProvider = new CodeCommentAuthenticationProvider(context.secrets);

  context.subscriptions.push(
    vscode.authentication.registerAuthenticationProvider(
      CodeCommentAuthenticationProvider.id,
      "Readable-Auth",
      authProvider
    )
  );

  context.subscriptions.push(
    vscode.commands.registerCommand("readable.login", async () => {
      // if (await authProvider.getSession()) {
      //   vscode.window.showInformationMessage("Readable: Already logged in!");
      //   return;
      // }

      let key: string | undefined;
      const selection = await vscode.window.showQuickPick(loginOptions);

      if (!selection) {
        return;
      }

      if (selection === loginOptions[0]) {
        const _key = await githubLogin();
        key = _key;
      } else if (selection === loginOptions[1]) {
        const _key = await emailLogin();
        key = _key;
      } else {
        return;
      }

      if (!key) {
        return;
      }

      await vscode.authentication.getSession(
        CodeCommentAuthenticationProvider.id,
        [key],
        { createIfNone: true }
      );
      vscode.window.showInformationMessage("Readable: Successfully logged in!");
      setTimeout(() => {
        status.updateStatusBar();
        vscode.window.showInformationMessage(
          "Readable: To generate a docstring, press  ctrl ' (cmd ' on Mac) while your cursor is in any function OR if the function is highlighted."
        );
      }, 500);
    }),
    vscode.commands.registerCommand("readable.reportBug", async () => {
      await vscode.env.openExternal(
        vscode.Uri.parse("https://github.com/ReadableLabs/readable/issues")
      );
    }),
    vscode.commands.registerCommand("readable.resetPassword", resetPassword),
    vscode.commands.registerCommand("readable.enableAutoComplete", () => {
      vscode.workspace
        .getConfiguration("readable")
        .update("enableAutoComplete", true, true);
      setTimeout(() => {
        status.updateStatusBar();
      }, 500);
    }),
    vscode.commands.registerCommand("readable.disableAutoComplete", () => {
      vscode.workspace
        .getConfiguration("readable")
        .update("enableAutoComplete", false, true);
      setTimeout(() => {
        status.updateStatusBar();
      }, 500);
    }),

    // vscode.commands.registerCommand("readable.giveFeedback", async () => {
    //   let choice = await vscode.window.showInformationMessage(
    //     "Readable: Found a bug or have a feature request? Tell us.",
    //     // "Notice something wrong about Readable? Tell us!",
    //     "Send Feedback"
    //   );
    //   if (!choice) {
    //     return;
    //   }
    //   if (choice === "Send Feedback") {
    //     const feedback = await vscode.window.showInputBox({
    //       ignoreFocusOut: true,
    //       placeHolder: "Feedback",
    //       prompt: "Enter Feedback:",
    //     });
    //     if (!feedback) {
    //       return;
    //     }
    //   }
    // }),

    vscode.commands.registerCommand("readable.version", async () => {
      await createSelection(
        new vscode.Range(new vscode.Position(0, 0), new vscode.Position(20, 0))
      );
      setTimeout(async () => {
        await removeSelections();
      }, 750);
      const version = context.extension.packageJSON.version;
      if (!version) {
        vscode.window.showInformationMessage("Error: Unable to get version");
        return;
      }
      vscode.window.showInformationMessage(
        "Readable is currently on version " + version
      );
    }),

    vscode.commands.registerCommand("readable.register", async () => {
      const session = await vscode.authentication.getSession(
        CodeCommentAuthenticationProvider.id,
        [],
        { createIfNone: false }
      );
      if (session) {
        vscode.window.showInformationMessage(
          "Readable: You are already logged in!"
        );
        return;
      }
      let choice = await vscode.window.showQuickPick(registerOptions);

      if (!choice) {
        return;
      }

      if (choice === registerOptions[0]) {
        const key = await githubLogin();

        if (!key) {
          return;
        }

        await vscode.authentication.getSession(
          CodeCommentAuthenticationProvider.id,
          [key],
          { createIfNone: true }
        );
        await vscode.window.showInformationMessage("Readable: Logged in!");
      } else if (choice === registerOptions[1]) {
        await register();
      } else {
        return;
      }
    })
  );

  const sync = new CommentSyncProvider(codeEditor);
  checkAccount();
  // await authProvider.checkAccount();

  // context.subscriptions.push(statusBarProvider.myStatusBar);
}

// this method is called when your extension is deactivated
export function deactivate() {} // make sure to log out here, and send an api request to delete the key with the token
