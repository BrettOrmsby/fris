/*
 * Configure the number of lines to display in the editor
 */
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { green, red } from "kolorist";
import type { FRISArgs } from "../lib/getCLIArgs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function setLines(args: FRISArgs) {
  // Get current settings
  let storage: { theme: string; lines: number };
  try {
    const file = await readFile(__dirname + "/../storage.json", "utf8");
    storage = JSON.parse(file);
  } catch (error) {
    console.error(red("✖ ") + "Unable to read storage");
    process.exit(1);
  }

  if (isNaN(args.lines)) {
    console.error(red("✖ ") + "Invalid value for the lines to display");
    process.exit(1);
  }
  if (args.lines < 1) {
    console.error(red("✖ ") + "Unable to display fewer than 1 lines");
    process.exit(1);
  }

  // Store the number on lines
  try {
    await writeFile(
      __dirname + "/../storage.json",
      JSON.stringify({ ...storage, lines: args.lines }),
    );
    console.log(green("Number of lines stored"));
    process.exit(1);
  } catch (error) {
    console.error(red("✖ ") + "Unable to store the number of lines");
    process.exit(0);
  }
}
