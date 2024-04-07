import {
  ExtensionContext,
  Range,
  TextDocument,
  commands,
  languages,
  window,
  workspace,
} from "vscode";
import { ContextualActionProvider } from "./code-action-provider";
import path from "path";
import * as fs from "fs";

export function activate(context: ExtensionContext) {
  let registerCodeActionsProvider = languages.registerCodeActionsProvider(
    { scheme: "file", language: "html" },
    new ContextualActionProvider()
  );
  context.subscriptions.push(registerCodeActionsProvider);

  let moveToNewFileCommand = commands.registerCommand(
    "extension.extractInlineCssToNewFile",
    moveToNewFile
  );
  context.subscriptions.push(moveToNewFileCommand);

  let moveToExistingFileCommand = commands.registerCommand(
    "extension.extractInlineCssToFile",
    moveToExistingFile
  );
  context.subscriptions.push(moveToExistingFileCommand);
}

export function deactivate() {}

async function moveToNewFile(
  document: TextDocument,
  inlineCss: string,
  pair: number[]
) {
  const fileName =
    (await window.showInputBox({
      prompt: "Enter file name",
    })) + ".css";

  const className = await window.showInputBox({
    prompt: "Enter class name",
  });

  if (!className || !fileName) {
    await window.showErrorMessage("Name cannot be empty");
    return;
  }

  //TODO give it a thought about opening file
  // const newUri = vscode.Uri.file(cssFilePath);
  // vscode.workspace.openTextDocument(newUri).then((doc) => {
  //   vscode.window.showTextDocument(doc);
  // });

  const cssFilePath = path.join(
    workspace.workspaceFolders![0].uri.fsPath,
    fileName
  );

  window.activeTextEditor?.edit((editBuilder) => {
    if (pair[3]) {
      const positionToInsert = document.positionAt(pair[3] - 1);
      editBuilder.delete(
        new Range(
          document.positionAt(pair[3] + 1),
          document.positionAt(pair[1])
        )
      );
      editBuilder.insert(positionToInsert, " " + className);
    } else {
      editBuilder.replace(
        new Range(document.positionAt(pair[0]), document.positionAt(pair[1])),
        `class="${className}"`
      );
    }
  });

  const extractedStyle = inlineCss.split('"')[1];
  fs.writeFileSync(cssFilePath, `.${className} { ${extractedStyle} }`);
}

async function moveToExistingFile(
  document: TextDocument,
  inlineCss: string,
  pair: number[]
) {
  const cssFiles = await workspace.findFiles("**/*.css");
  if (cssFiles.length === 0) {
    window.showErrorMessage("No .css file was found!");
    //TODO redirect to creating?
    return;
  }

  const cssFileNames = cssFiles.map((file) => path.basename(file.path));
  const chosenFile = await window.showQuickPick(cssFileNames);

  if (!chosenFile) {
    return;
  }

  const className = await window.showInputBox({
    prompt: "Enter class name",
  });

  if (!className) {
    return;
  }

  const cssFilePath = path.join(
    workspace.workspaceFolders![0].uri.fsPath,
    chosenFile
  );

  window.activeTextEditor?.edit((editBuilder) => {
    editBuilder.replace(
      new Range(document.positionAt(pair[0]), document.positionAt(pair[1])),
      `class="${className}"`
    );
  });

  const extractedStyle = inlineCss.split('"')[1];
  fs.appendFileSync(cssFilePath, `\n\n.${className} { ${extractedStyle} }`);
}
