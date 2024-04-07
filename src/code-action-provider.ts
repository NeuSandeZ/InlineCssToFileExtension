import {
  CodeActionProvider,
  TextDocument,
  Range,
  CodeAction,
  window,
  CodeActionKind,
} from "vscode";
import { ParseText } from "./parser";

export class ContextualActionProvider implements CodeActionProvider {
  public async provideCodeActions(
    document: TextDocument,
    range: Range
  ): Promise<CodeAction[] | null | undefined> {
    const editor = window.activeTextEditor;
    if (!editor) {
      return;
    }

    //TODO should i parse it always or only when the change is applied? TO CONSIDER
    const styleIndexes: number[][] = await ParseText(document.getText());

    if (!styleIndexes) {
      return;
    }

    const cursorOffset = document.offsetAt(range.start);
    const commands = await GetCommands(styleIndexes, document, cursorOffset);
    if (commands) {
      return commands;
    }

    return;
  }
}

async function GetCommands(
  styleIndexes: number[][],
  document: TextDocument,
  cursorOffset: number
) {
  for (let pair of styleIndexes) {
    const startOffset = pair[0];
    const endOffset = pair[1];

    if (cursorOffset >= startOffset && cursorOffset <= endOffset) {
      const styleText = document.getText().substring(startOffset, endOffset);
      const newFile = new CodeAction(
        "Move to a new file",
        CodeActionKind.QuickFix
      );
      newFile.command = {
        title: "Move to new file",
        command: "extension.extractInlineCssToNewFile",
        arguments: [document, styleText, pair],
      };

      const toExistingFile = new CodeAction(
        "Move to file",
        CodeActionKind.QuickFix
      );

      toExistingFile.command = {
        title: "Move to file",
        command: "extension.extractInlineCssToFile",
        arguments: [document, styleText, pair],
      };
      return [newFile, toExistingFile];
    }
  }
}
