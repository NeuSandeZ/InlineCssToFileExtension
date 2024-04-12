import { Parser } from "htmlparser2";

export interface ParseResult {
  indexes: number[][];
  lastLinkIndex?: number | null;
}

export async function ParseText(document: string): Promise<ParseResult> {
  let indexes: number[][] = [];
  let indexesOfClass: number[] = [];
  let indexesOfStyle: number[] = [];
  let lastLinkIndex: number | null = null;
  let test: number[] = [];

  const parser = new Parser({
    onattribute(name, value) {
      if (name === "class") {
        indexesOfClass.push(parser.startIndex, parser.endIndex);
      }
      if (name === "style" && value.trim() !== "") {
        indexesOfStyle.push(parser.startIndex, parser.endIndex);
      }
    },
    onclosetag(name, isImplied) {
      if (name === "link" && isImplied) {
        lastLinkIndex = parser.endIndex;
        test.push(parser.endIndex);
      }
      if (indexesOfClass.length > 0 && indexesOfStyle.length > 0) {
        indexes.push([...indexesOfStyle, ...indexesOfClass]);
      } else if (indexesOfStyle.length > 0) {
        indexes.push([...indexesOfStyle]);
      }

      indexesOfStyle = [];
      indexesOfClass = [];
    },
  });

  parser.write(document);
  parser.end();

  return { indexes, lastLinkIndex };
}
