import { Parser } from "htmlparser2";

export async function ParseText(document: string): Promise<number[][]> {
  let indexes: number[][] = [];
  let indexesOfClass: number[] = [];
  let indexesOfStyle: number[] = [];
  let indexOfOpenTag: number;
  let indexOfCloseTag: number;

  const parser = new Parser({
    onopentag(name) {
      indexOfOpenTag = parser.startIndex;
    },
    onattribute(name, value) {
      if (name === "class") {
        indexesOfClass.push(parser.startIndex, parser.endIndex);
      }
      if (name === "style" && value.trim() !== "") {
        indexesOfStyle.push(parser.startIndex, parser.endIndex);
      }
    },
    onclosetag(name) {
      indexOfCloseTag = parser.startIndex;

      if (indexesOfClass.length > 0 && indexesOfStyle.length > 0) {
        indexes.push([indexesOfStyle[0], indexesOfStyle[1], indexesOfClass[1]]);
      } else if (indexesOfStyle.length > 0) {
        indexes.push([...indexesOfStyle]);
      }

      indexesOfStyle = [];
      indexesOfClass = [];
    },
  });

  parser.write(document);
  parser.end();

  return indexes;
}
