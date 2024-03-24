#!/usr/bin/env node
/*
 * Script for running the fris program
 */

import { readFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { bold, red } from "kolorist";
import { FRISArgs, getCLIArgs } from "./lib/getCLIArgs.js";
import setTheme from "./actions/setTheme.js";
import setLines from "./actions/setLines.js";
import replaceAll from "./actions/replaceAll.js";
import replaceSome from "./actions/replaceSome.js";

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
    fris -l NUMBER | --lines=NUMBER
    fris -p | --picker
    fris -h | --help
    fris --version
  
  ${bold("Options")}
    -h --help                        Show this screen.
    --version                        Show version.
    -t THEME --theme=THEME           Set a new code highlighting theme.
    -l NUMBER --lines=NUMBER         Set the number of lines to display when finding and replacing.
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
  await setTheme(args);
}

/*
 * SET LINES
 */
if (args.lines !== null) {
  await setLines(args);
}

/*
 * REPLACE ALL
 */
if (args.all) {
  await replaceAll(args);
}

/*
 * REPLACE SOME
 */
await replaceSome(args);
