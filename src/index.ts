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
import { blue, bold, green, link, red, yellow } from "kolorist";
import { Theme, BUNDLED_THEMES, Lang, BUNDLED_LANGUAGES } from "shiki";
import prompts from "prompts";
import { sync } from "glob";

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

  ${bold("Usage")}
    fris <file_path> <find_pattern> <replacer> [options]
    fris -t THEME | --theme=THEME
    fris -p | --picker
    fris -h | --help
    fris --version
  
  ${bold("Options")}
    -h --help                        Show this screen.
    --version                        Show version.
    -t THEME --theme=THEME           Set a new code highlighting theme.
    -p --picker                      Show the picker and autofill with other present options.
    -r --regex                       Use regex when finding and replacing.
    -a --all                         Replace all occurrences without prompting.
    -s SCOPE --scope=SCOPE           Scope to find all occurrences within.
    -i SCOPE --ignore=SCOPE          Scope to ignore all found occurrences within.
    
  ${bold("User Actions")}
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

// Get all supported shiki languages
const allLanguages = BUNDLED_LANGUAGES.map((language) =>
  language.aliases ? [language.id, ...language.aliases] : language.id,
).flat() as Lang[];

// Get all matching files with results
type CodeSearchFile = {
  fileName: string;
  filePath: string;
  code: string;
  language: Lang;
  findResults: FindResult[];
};
const files: CodeSearchFile[] = [];

for (const file of sync(args.file)) {
  const fullFile = path.resolve(process.cwd(), file);

  // Read the code from the file
  let code: string;
  try {
    code = await readFile(fullFile, "utf8");
  } catch (error) {
    console.error(
      `${red("✖ ")} Unable to read file: ${link(file, fullFile)}, ${
        error.message
      }`,
    );
    process.exit(1);
  }

  // Get the shiki language using the file extension or by prompting
  let language;

  const fileExtension = fullFile.match(/\.([^.]+)$/)?.[1];
  if (allLanguages.includes(fileExtension as Lang)) {
    language = fileExtension;
  } else {
    language = (
      await prompts([
        {
          name: "language",
          type: "autocomplete",
          message: `Enter the language to use when finding and replacing in ${file}: `,
          choices: allLanguages.map((language) => {
            return { title: language };
          }),
          initial: allLanguages[0],
        },
      ])
    ).language;
  }

  // TODO: why is the reverse needed?
  const findResults = findWithArgs(code, language, args).reverse();
  if (findResults.length > 0) {
    files.push({
      fileName: file,
      filePath: fullFile,
      code,
      language,
      findResults,
    });
  }
}

if (files.length === 0) {
  console.log(yellow("No Results Found"));
  process.exit(0);
}

/*
 * REPLACE ALL
 */
if (args.all) {
  for (const { code, findResults, filePath } of files) {
    await replace(code, findResults, filePath);
  }
  const totalResults = files.reduce(
    (prev, file) => prev + file.findResults.length,
    0,
  );
  console.log(
    green(
      `Replaced ${totalResults}/${totalResults} Result${
        totalResults === 1 ? "" : "s"
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
  let searchResultIndex = 0;
  const file = files.find((file) => {
    searchResultIndex += file.findResults.length;
    if (searchResultIndex > resultNumber) {
      return true;
    }
  });

  const codePreview = getReplaceCode(
    file.code,
    file.language,
    file.findResults[searchResultIndex - resultNumber - 1],
  );

  const numberFindResultsLeft = files.reduce(
    (prev, file) => prev + file.findResults.length,
    0,
  );

  console.log(
    `${bold(`${resultNumber + 1} of ${numberFindResultsLeft}`)} ${green(
      "•",
    )} ${bold("Replace with:")} ${green(args.replace)}
${blue(file.fileName)}
    ${codePreview}
    
    `,
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
    const newFileContents = await replace(
      file.code,
      [file.findResults[searchResultIndex - resultNumber - 1]],
      file.filePath,
    );
    file.code = newFileContents;
    file.findResults = await findWithArgs(file.code, file.language, args);

    const numberFindResultsLeft = files.reduce(
      (prev, file) => prev + file.findResults.length,
      0,
    );

    if (numberFindResultsLeft === 0) {
      console.log(green("All Results Replaced"));
      process.exit(1);
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
function findWithArgs(
  code: string,
  language: Lang,
  args: FRISArgs,
): FindResult[] {
  const pattern = args.regex ? new RegExp(args.find) : args.find;
  return find(code, pattern, {
    lang: language,
    scope: args.scope,
    ignore: args.ignore,
  });
}

/*
 * Replace some results in the code and update the file
 */
async function replace(
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
    console.error(
      `${red("✖")} Unable to write to file: ${filePath}, ${error.message}`,
    );
  }
  return output;
}
