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
  let fileName = await window.showInputBox({
    prompt: "Enter file name",
  });

  if (!fileName) {
    await window.showInformationMessage("File name cannot be empty!");
    return;
  }

  const className = await window.showInputBox({
    prompt: "Enter class name",
  });

  if (!className) {
    await window.showInformationMessage("Class name cannot be empty!");
    return;
  }

  fileName += ".css";
  await applyEditAndWriteCss(document, pair, fileName, className, linkIndex);
}

async function moveToExistingFile(
  document: TextDocument,
  pair: number[],
  linkIndex: number | null
) {
  const cssFiles = await searchForCssFiles();
  if (cssFiles.length === 0) {
    await window.showErrorMessage("No .css file was found!");
    let choice = await window.showQuickPick(["Yes", "No"], {
      placeHolder: "Want to create a CSS file?",
    });
    choice === "Yes" ? moveToNewFile(document, pair, linkIndex) : null;
    return;
  }

  const cssFileNames = cssFiles.map((file) => ({
    label: path.basename(file.path),
    path: file.fsPath,
  }));
  const chosenFileItem = await window.showQuickPick(cssFileNames, {
    placeHolder: "Select a CSS file to move styles to",
  });

  if (!chosenFileItem) {
    return;
  }

  const className = await window.showInputBox({
    prompt: "Enter class name",
  });

  if (!className) {
    return;
  }

  const { path: chosenFilePath } = chosenFileItem;
  await applyEditAndWriteCss(
    document,
    pair,
    chosenFilePath,
    className,
    linkIndex
  );
}

async function applyEditAndWriteCss(
  document: TextDocument,
  pair: number[],
  filePath: string,
  className: string,
  linkIndex: number | null
) {
  let editor = window.activeTextEditor;
  if (!editor) {
    return;
  }

  await editor.edit((editBuilder) => {
    const documentText = document.getText();
    const extractedStyleContent = documentText.substring(
      pair[0] + 7,
      pair[1] - 1
    );
    if (pair[2]) {
      const minInx = Math.min(...pair);
      const maxInx = Math.max(...pair);
      const extractedClassContent = documentText.substring(
        pair[2] + 7,
        pair[3] - 1
      );

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
    //TODO add detection of .css files linked to a componenet's html
    // and extract them automatically there after triggering command??
    if (!fs.existsSync(filePath)) {
      const newCssFilePath = path.join(
        path.dirname(editor.document.uri.fsPath),
        filePath
      );
      fs.writeFileSync(
        newCssFilePath,
        `.${className} { ${extractedStyleContent} }`
      );
    } else {
      fs.appendFileSync(
        filePath,
        `\n\n.${className} { ${extractedStyleContent} }`
      );
    }
    //TODO handle imports for angular and react?
    const filePathBase = path.basename(filePath);
    if (linkIndex && documentText.includes(filePathBase)) {
      return;
    } else if (linkIndex && !documentText.includes(filePathBase)) {
      let postionToInsertImport = document.positionAt(linkIndex! + 1);
      editBuilder.insert(
        postionToInsertImport,
        `\n\t\t<link rel="stylesheet" href="${filePathBase}">`
      );
    } else if (!linkIndex && !documentText.includes(filePathBase)) {
      const titleIndex = documentText.indexOf("</title>");
      //TODO temporary fix so react and angular don't get imports
      if (titleIndex === -1) {
        return;
      }
      const postionToInsertImport = document.positionAt(
        titleIndex + "</title>".length
      );
      editBuilder.insert(
        postionToInsertImport,
        `\n\t\t<link rel="stylesheet" href="${filePathBase}">`
      );
    }
  });
}

async function searchForCssFiles() {
  const srcExists = path
    .dirname(window.activeTextEditor!.document.uri.fsPath)
    .includes("src");

  let cssFiles;

  if (srcExists) {
    return (cssFiles = await workspace.findFiles("**/src/**/*.css"));
  } else {
    return (cssFiles = await workspace.findFiles("**/*.css"));
  }
}
