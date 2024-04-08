import { Parser } from "htmlparser2";

export async function ParseText(document: string): Promise<number[][]> {
  let indexes: number[][] = [];
  let indexesOfClass: number[] = [];
  let indexesOfStyle: number[] = [];

  const parser = new Parser({
    onattribute(name, value) {
      if (name === "class") {
        indexesOfClass.push(parser.startIndex, parser.endIndex);
      }
      if (name === "style" && value.trim() !== "") {
        indexesOfStyle.push(parser.startIndex, parser.endIndex);
      }
    },
    onclosetag(name) {
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

  return indexes;
}
