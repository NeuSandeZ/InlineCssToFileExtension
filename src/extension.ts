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
  pair: number[],
  linkIndex: number | null
) {
  const fileName =
    (await window.showInputBox({
      prompt: "Enter file name",
    })) + ".css";

  const className = await window.showInputBox({
    prompt: "Enter class name",
  });

  if (!className || !fileName) {
    window.showErrorMessage("Name cannot be empty");
    return;
  }

  applyEditAndWriteCss(document, pair, fileName, className, linkIndex);
}

async function moveToExistingFile(
  document: TextDocument,
  pair: number[],
  linkIndex: number | null
) {
  const cssFiles = await workspace.findFiles("**/*.css");
  if (cssFiles.length === 0) {
    window.showErrorMessage("No .css file was found!");
    let choice = await window.showQuickPick(["Yes", "No"], {
      placeHolder: "Want to create a CSS file?",
    });
    choice === "Yes" ? moveToNewFile(document, pair, linkIndex) : null;
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

  applyEditAndWriteCss(document, pair, chosenFile, className, linkIndex);
}

async function applyEditAndWriteCss(
  document: TextDocument,
  pair: number[],
  fileName: string,
  className: string,
  linkIndex: number | null
) {
  let editor = window.activeTextEditor;
  if (!editor) {
    return;
  }
  const cssFilePath = path.join(
    path.dirname(editor.document.uri.fsPath),
    fileName
  );

  await editor.edit((editBuilder) => {
    const documentText = document.getText();
    const extractedStyleContent = documentText.substring(
      pair[0] + 7,
      pair[1] - 1
    );
    if (pair[2]) {
      const minInx = Math.min(...pair);
      const maxInx = Math.max(...pair);
      const extractedClassContent = document
        .getText()
        .substring(pair[2] + 7, pair[3] - 1);

      editBuilder.replace(
        new Range(document.positionAt(minInx), document.positionAt(maxInx)),
        `class="${extractedClassContent} ${className}"`
      );
    } else {
      editBuilder.replace(
        new Range(document.positionAt(pair[0]), document.positionAt(pair[1])),
        `class="${className}"`
      );
    }
    if (!fs.existsSync(cssFilePath)) {
      fs.writeFileSync(
        cssFilePath,
        `.${className} { ${extractedStyleContent} }`
      );
    } else {
      fs.appendFileSync(
        cssFilePath,
        `\n\n.${className} { ${extractedStyleContent} }`
      );
    }
    if (linkIndex && documentText.includes(fileName)) {
      return;
    } else if (linkIndex && !documentText.includes(fileName)) {
      let postionToInsertImport = document.positionAt(linkIndex! + 1);
      editBuilder.insert(
        postionToInsertImport,
        `\n\t\t<link rel="stylesheet" href="${path.basename(cssFilePath)}">`
      );
    } else if (!linkIndex && !documentText.includes(fileName)) {
      const titleIndex = documentText.indexOf("</title>");
      const postionToInsertImport = document.positionAt(
        titleIndex + "</title>".length
      );
      editBuilder.insert(
        postionToInsertImport,
        `\n\t\t<link rel="stylesheet" href="${path.basename(cssFilePath)}">`
      );
    }
  });
}
