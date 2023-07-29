#!/usr/bin/env node
/*
 * Script for running the fris program
 */

import { FRISArgs, getCLIArgs } from "./getCLIArgs.js";
import find, { type FindResult } from "./find.js";
import getReplaceCode from "./getReplaceCode.js";
import { escapeStringToRegex } from "./utils.js";
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { bold, green, link, red, yellow } from "kolorist";
import { Theme, BUNDLED_THEMES } from "shiki";
import prompts from "prompts";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Get the arguments
let args: FRISArgs;
try {
  args = await getCLIArgs();
} catch (error) {
  console.error(red("✖ ") + error.message);
  process.exit(1);
}

/*
 * HELP
 */
if (args.help) {
  console.log(`FRIS, Find and Replace In Scopes

  Usage:
    fris <file_path> <find_pattern> <replacer> [options]
    fris -t THEME | --theme=THEME
    fris -p | --picker
    fris -h | --help
    fris --version
  
  Options:
    -h --help                        Show this screen.
    --version                        Show version.
    -t THEME --theme=THEME           Set a new code highlighting theme.
    -p --picker                      Show the picker and autofill with other present options.
    -r --regex                       Use regex when finding and replacing.
    -a --all                         Replace all occurrences without prompting.
    -s SCOPE --scope=SCOPE           Scope to find all occurrences within.
    -i SCOPE --ignore=SCOPE          Scope to ignore all found occurrences within.
    -l LANGUAGE --language=LANGUAGE  Language to tokenize the code with
    
  User Actions:
    Picker:  
      Use enter to submit the answer.
      Use arrow keys or tab to navigate between no / yes prompts
    Find and Replace: 
      Use ^C or Q to quit
      Use enter or R to replace the result
      Use arrow keys to navigate between results
      `);
  process.exit(0);
}

/*
 * VERSION
 */
if (args.version) {
  const file = await readFile(__dirname + "/../package.json", "utf8");
  const packageJSON = JSON.parse(file);
  console.log(packageJSON.version);
  process.exit(0);
}

/*
 * SET THEME
 */
if (args.theme) {
  if (!BUNDLED_THEMES.includes(args.theme)) {
    let file;
    try {
      file = await readFile(__dirname + "/storage.json", "utf8");
    } catch (error) {
      // Ignore eslint empty block
    }
    const theme: Theme = file ? JSON.parse(file).theme : "dracula";
    args.theme = (
      await prompts([
        {
          name: "newTheme",
          type: "autocomplete",
          message: "Theme: ",
          choices: BUNDLED_THEMES.map((theme) => {
            return { title: theme };
          }),
          initial: theme,
        },
      ])
    ).newTheme;
  }
  try {
    await writeFile(
      __dirname + "/storage.json",
      JSON.stringify({ theme: args.theme }),
    );
    console.log(green("Theme stored"));
  } catch (error) {
    console.error(red("✖ ") + "Unable to store theme");
  }
  process.exit(1);
}

/*
 * MAIN PROGRAM
 */
// Get the code and find the results
let code;
try {
  code = await readFile(path.resolve(process.cwd(), args.file), "utf8");
} catch (error) {
  console.error(
    red("✖ ") +
      "Unable to read file: " +
      path.resolve(process.cwd(), args.file) +
      ", " +
      error.message,
  );
  process.exit(1);
}
let findResults = await findWithArgs(code, args);
if (findResults.length === 0) {
  console.log(yellow("No Results Found"));
  process.exit(0);
}

/*
 * REPLACE ALL
 */
if (args.all) {
  await replace(code, findResults);
  console.log(
    green(
      `Replaced ${findResults.length}/${findResults.length} Result${
        findResults.length === 1 ? "" : "s"
      }`,
    ),
  );
  process.exit(0);
}

/*
 * REPLACE SOME
 */

// Present user with menu showing the code and allowing to switch between the results
let resultNumber = 0;

// eslint-disable-next-line
while (true) {
  const codePreview = getReplaceCode(
    code,
    args.language,
    findResults[resultNumber],
  );
  console.log(
    bold(`${resultNumber + 1} of ${findResults.length}`) +
      green(" • ") +
      bold("Replace with: ") +
      green(args.replace) +
      "\n" +
      codePreview +
      "\n\n",
  );
  const keyPressed = await keypress();
  // Quit: ^C / Q
  if (keyPressed.length > 0 && (keyPressed[0] === 3 || keyPressed[0] === 113)) {
    console.log(red("Quit"));
    process.exit(1);
  }

  // Replace: R / Enter
  if (
    keyPressed.length > 0 &&
    (keyPressed[0] === 114 || keyPressed[0] === 13)
  ) {
    // Update the file with the replaced result and update the results
    const newFileContents = await replace(code, [findResults[resultNumber]]);
    code = newFileContents;
    findResults = await findWithArgs(code, args);
    if (findResults.length === 0) {
      console.log(green("All Results Replaced"));
      process.exit(1);
    } else if (resultNumber > findResults.length - 1) {
      resultNumber = findResults.length - 1;
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
      resultNumber === 0 ? findResults.length - 1 : resultNumber - 1;
  }

  // Next: Right Arrow / Down Arrow
  if (
    keyPressed.length > 2 &&
    keyPressed[0] === 27 &&
    keyPressed[1] === 91 &&
    (keyPressed[2] === 67 || keyPressed[2] === 66)
  ) {
    resultNumber =
      resultNumber === findResults.length - 1 ? 0 : resultNumber + 1;
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

/*
 * Find all the results
 */
async function findWithArgs(
  code: string,
  args: FRISArgs,
): Promise<FindResult[]> {
  const pattern = args.regex ? new RegExp(args.find) : args.find;
  return find(code, pattern, {
    lang: args.language,
    scope: args.scope,
    ignore: args.ignore,
  });
}

/*
 * Replace some results in the code and update the file
 */
async function replace(code: string, occurrences: FindResult[]) {
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
    await writeFile(path.resolve(process.cwd(), args.file), output);
  } catch (error) {
    console.error(
      red("✖ ") +
        "Unable to write to file: " +
        link(
          path.resolve(process.cwd(), args.file),
          path.resolve(process.cwd(), args.file),
        ) +
        ", " +
        error.message,
    );
  }
  return output;
}
