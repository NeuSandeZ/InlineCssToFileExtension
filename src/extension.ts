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

  applyEditAndWriteCss(document, inlineCss, pair, fileName, className);
}

async function moveToExistingFile(
  document: TextDocument,
  inlineCss: string,
  pair: number[]
) {
  const cssFiles = await workspace.findFiles("**/*.css");
  if (cssFiles.length === 0) {
    window.showErrorMessage("No .css file was found!");
    moveToNewFile(document, inlineCss, pair);
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

  applyEditAndWriteCss(document, inlineCss, pair, chosenFile, className);
}

function applyEditAndWriteCss(
  document: TextDocument,
  inlineCss: string,
  pair: number[],
  fileName: string,
  className: string
) {
  const cssFilePath = path.join(
    workspace.workspaceFolders![0].uri.fsPath,
    fileName
  );

  window.activeTextEditor!.edit((editBuilder) => {
    if (pair[2]) {
      const positionToInsert = document.positionAt(pair[2] - 1);
      editBuilder.delete(
        new Range(
          document.positionAt(pair[2] + 1),
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
  if (!fs.existsSync(cssFilePath)) {
    fs.writeFileSync(cssFilePath, `.${className} { ${extractedStyle} }`);
  } else {
    fs.appendFileSync(cssFilePath, `\n\n.${className} { ${extractedStyle} }`);
  }
}
