import { Parser } from "htmlparser2";

export async function ParseText(document: string): Promise<number[][]> {
  let indexes: number[][] = [];
  let indexesOfClass: number[] = [];
  let indexesOfStyle: number[] = [];
  let indexOfOpenTag: number;
  let indexOfCloseTag: number;

  //TODO after executing command, code doesn't go into parser
  const parser = new Parser({
    onopentag(name, attribs) {
      indexOfOpenTag = parser.startIndex;
    },
    onattribute(name) {
      if (name === "class") {
        indexesOfClass.push(parser.startIndex, parser.endIndex);
      }
      if (name === "style") {
        indexesOfStyle.push(parser.startIndex, parser.endIndex);
      }
    },
    onclosetag(name) {
      indexOfCloseTag = parser.startIndex;

      let minValue = Math.min(...indexesOfClass, ...indexesOfStyle);
      let maxValue = Math.max(...indexesOfClass, ...indexesOfStyle);

      if (
        indexOfOpenTag <= minValue &&
        indexOfCloseTag >= maxValue &&
        indexesOfStyle.length > 0
      ) {
        indexes.push([...indexesOfStyle, ...indexesOfClass]);

        indexesOfStyle = [];
        indexesOfClass = [];
      }
    },
  });

  parser.write(document);
  parser.end();

  return indexes;
}
