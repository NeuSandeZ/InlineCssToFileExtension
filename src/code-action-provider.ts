import {
  CodeActionProvider,
  TextDocument,
  Range,
  CodeAction,
  window,
  CodeActionKind,
} from "vscode";
import { ParseResult, ParseText } from "./parser";

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
    const parseResult: ParseResult = await ParseText(document.getText());

    if (!parseResult) {
      return;
    }

    const cursorOffset = document.offsetAt(range.start);
    const commands = await GetCommands(
      parseResult.indexes,
      document,
      cursorOffset,
      parseResult.lastLinkIndex
    );
    if (commands) {
      return commands;
    }

    return;
  }
}

async function GetCommands(
  styleIndexes: number[][],
  document: TextDocument,
  cursorOffset: number,
  linkIndex?: number | null
) {
  for (let pair of styleIndexes) {
    const startOffset = pair[0];
    const endOffset = pair[1];

    if (cursorOffset >= startOffset && cursorOffset <= endOffset) {
      const newFile = new CodeAction(
        "Move to a new file",
        CodeActionKind.RefactorMove
      );
      newFile.command = {
        title: "Move to new file",
        command: "extension.extractInlineCssToNewFile",
        arguments: [document, pair, linkIndex],
      };

      const toExistingFile = new CodeAction(
        "Move to file",
        CodeActionKind.RefactorMove
      );

      toExistingFile.command = {
        title: "Move to file",
        command: "extension.extractInlineCssToFile",
        arguments: [document, pair, linkIndex],
      };
      return [newFile, toExistingFile];
    }
  }
}
