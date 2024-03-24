/*
 * Replace results in a file
 */
import { writeFile } from "fs/promises";
import { red } from "kolorist";
import { FindResult } from "./find.js";
import { FRISArgs } from "./getCLIArgs.js";
import escapeStringToRegex from "../utils/escapeStringToRegex.js";

export default async function replace(
  args: FRISArgs,
  code: string,
  occurrences: FindResult[],
  filePath: string,
) {
  const results = [...occurrences];
  const lines = code.split("\n");
  let output = "";

  // Find the position where the replaces must occur but add all other lines to the output
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // No more results, so we can just add all the lines
    if (results.length === 0) {
      output += output === "" ? line : "\n" + line;
    } else if (i < results[0].start.line) {
      // Result occurs on latter lines
      output += output === "" ? line : "\n" + line;
    } else {
      // Result is on this line
      if (output !== "") {
        output += "\n";
      }

      // Need to keep track of characters because there can be multiple results on the same line
      let charIndex = 0;
      while (results.length > 0 && results[0].start.line === i) {
        // Get the text before the match and the matched text
        const beforeMatch = line.substring(
          charIndex,
          results[0].start.character,
        );
        const match = line.substring(
          results[0].start.character,
          results[0].end.character,
        );

        // Update the output with the before match and replaced match text and remove the result
        const pattern = args.regex
          ? new RegExp(args.find)
          : escapeStringToRegex(args.find);
        output += beforeMatch + match.replace(pattern, args.replace);
        charIndex += beforeMatch.length + match.length;
        results.shift();
      }
      output += line.substring(charIndex);
    }
  }

  // Save the file
  try {
    await writeFile(filePath, output);
  } catch (error) {
    throw new Error(
      `${red("✖")} Unable to write to file: ${filePath}, ${error.message}`,
    );
  }
  return output;
}
