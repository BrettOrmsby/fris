/*
 * Create the interface that shows the where the results are and allows the choice to replace them
 */
import { createLogUpdate } from "log-update";
import { blue, bold, green, red, yellow } from "kolorist";
import { FRISArgs } from "../lib/getCLIArgs.js";
import { findWithArgs } from "../lib/find.js";
import searchFilesForResults from "../lib/searchFilesForResults.js";
import getReplaceCode from "../lib/getReplaceCode.js";
import replace from "../lib/replace.js";

export default async function replaceSome(args: FRISArgs) {
  const files = await searchFilesForResults(args);

  if (files.length === 0) {
    console.log(yellow("No Results Found"));
    process.exit(0);
  }

  // Present user with menu showing the code and allowing to switch between the results
  let resultNumber = 0;
  let nextWarning = "";
  const logReplace = createLogUpdate(process.stdout, {
    showCursor: true,
  });

  // eslint-disable-next-line
  while (true) {
    // Get the file where the search result is
    let searchResultIndex = 0;
    const file = files.find((file) => {
      searchResultIndex += file.findResults.length;
      if (searchResultIndex > resultNumber) {
        return true;
      }
    });

    const findResult =
      file.findResults[
        file.findResults.length - (searchResultIndex - resultNumber)
      ];
    const codePreview = await getReplaceCode(
      file.code,
      file.language,
      findResult,
    );

    const numberFindResultsLeft = files.reduce(
      (prev, file) => prev + file.findResults.length,
      0,
    );

    logReplace(
      `${bold(yellow(nextWarning))}
${bold(`${resultNumber + 1} of ${numberFindResultsLeft}`)} ${green("•")} ${bold(
        "Replace with:",
      )} ${green(args.replace)}
${blue(file.fileName)}
    ${codePreview}
`,
    );

    nextWarning = "";

    const keyPressed = await keypress();

    // Quit: ^C / Q
    if (
      keyPressed.length > 0 &&
      (keyPressed[0] === 3 || keyPressed[0] === 113)
    ) {
      console.log(red("Quit"));
      process.exit(0);
    }

    // Replace: R / Enter
    if (
      keyPressed.length > 0 &&
      (keyPressed[0] === 114 || keyPressed[0] === 13)
    ) {
      // Update the file with the replaced result and update the results
      try {
        const newFileContents = await replace(
          args,
          file.code,
          [findResult],
          file.filePath,
        );
        file.code = newFileContents;
        file.findResults = await findWithArgs(file.code, file.language, args);
      } catch (e) {
        nextWarning = e.message;
        continue;
      }

      const numberFindResultsLeft = files.reduce(
        (prev, file) => prev + file.findResults.length,
        0,
      );

      if (numberFindResultsLeft === 0) {
        console.log(green("All Results Replaced"));
        process.exit(0);
      } else if (resultNumber > numberFindResultsLeft - 1) {
        resultNumber = numberFindResultsLeft - 1;
      }
    }

    // Previous: Left Arrow / Up Arrow
    if (
      keyPressed.length > 2 &&
      keyPressed[0] === 27 &&
      keyPressed[1] === 91 &&
      (keyPressed[2] === 68 || keyPressed[2] === 65)
    ) {
      resultNumber =
        resultNumber === 0 ? numberFindResultsLeft - 1 : resultNumber - 1;
    }

    // Next: Right Arrow / Down Arrow
    if (
      keyPressed.length > 2 &&
      keyPressed[0] === 27 &&
      keyPressed[1] === 91 &&
      (keyPressed[2] === 67 || keyPressed[2] === 66)
    ) {
      resultNumber =
        resultNumber === numberFindResultsLeft - 1 ? 0 : resultNumber + 1;
    }
  }
}

/*
 * Wait for a key to be pressed and return the key
 */
async function keypress(): Promise<number[]> {
  process.stdin.resume();
  process.stdin.setRawMode(true);
  return await new Promise((resolve) =>
    process.stdin.once("data", (data) => {
      const byteArray = [...data];
      process.stdin.setRawMode(false);
      resolve(byteArray);
    }),
  );
}
