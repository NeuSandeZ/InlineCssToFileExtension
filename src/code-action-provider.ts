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
    const commands = await GetCommands(parseResult, cursorOffset, document);
    if (commands) {
      return commands;
    }

    return;
  }
}

async function GetCommands(
  parseResult: ParseResult,
  cursorOffset: number,
  document: TextDocument
) {
  for (let pair of parseResult.indexes) {
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
        arguments: [
          document,
          pair,
          parseResult.lastLinkIndex,
          parseResult.headIndex,
        ],
      };

      const toExistingFile = new CodeAction(
        "Move to file",
        CodeActionKind.RefactorMove
      );

      toExistingFile.command = {
        title: "Move to file",
        command: "extension.extractInlineCssToFile",
        arguments: [
          document,
          pair,
          parseResult.lastLinkIndex,
          parseResult.headIndex,
        ],
      };
      return [newFile, toExistingFile];
    }
  }
}
