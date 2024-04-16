import { Parser } from "htmlparser2";

export interface IndexesResult {
  indexesForCommands: number[][];
  lastLinkIndex: number | null;
}

export async function GetIndexes(document: string): Promise<IndexesResult> {
  const indexesForCommands: number[][] = [];
  let indexesOfClass: number[] = [];
  let indexesOfStyle: number[] = [];
  let lastLinkIndex: number | null = null;

  const parser = new Parser({
    onopentag(name, attribs) {
      if (attribs.style && attribs.class) {
        indexesForCommands.push([...indexesOfStyle, ...indexesOfClass]);
        indexesOfStyle = [];
        indexesOfClass = [];
      } else if (attribs.style) {
        indexesForCommands.push([...indexesOfStyle]);
        indexesOfStyle = [];
      } else if (attribs.class) {
        indexesOfClass = [];
      }
    },
    onattribute(name, value) {
      if (name === "style" && value.trim() !== "") {
        indexesOfStyle.push(parser.startIndex, parser.endIndex);
      } else if (name === "class") {
        indexesOfClass.push(parser.startIndex, parser.endIndex);
      }
    },
    onclosetag(name, isImplied) {
      if (name === "link" && isImplied) {
        lastLinkIndex = parser.endIndex;
      }
    },
  });

  parser.write(document);
  parser.end();

  return { indexesForCommands, lastLinkIndex };
}
