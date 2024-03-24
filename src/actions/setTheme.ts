/*
 * Configure the editor syntax highlighting theme
 */
import { readFile, writeFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { green, red } from "kolorist";
import { BundledTheme, bundledThemes } from "shiki";
import prompts from "prompts";
import type { FRISArgs } from "../lib/getCLIArgs.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default async function setTheme(args: FRISArgs) {
  const themes = Object.keys(bundledThemes) as BundledTheme[];

  // Get the current settings
  let storage: { theme: string; lines: number };
  try {
    const file = await readFile(__dirname + "/../storage.json", "utf8");
    storage = JSON.parse(file);
  } catch (error) {
    console.error(red("✖ ") + "Unable to read storage");
    process.exit(1);
  }

  // If a theme is not valid or not provided, ask for a new theme
  if (!themes.includes(args.theme)) {
    const theme: BundledTheme = (storage.theme as BundledTheme) || "dracula";
    args.theme = (
      await prompts([
        {
          name: "newTheme",
          type: "autocomplete",
          message: "Theme: ",
          choices: themes.map((theme) => {
            return { title: theme };
          }),
          initial: theme,
        },
      ])
    ).newTheme;
  }

  // Store the theme
  try {
    await writeFile(
      __dirname + "/../storage.json",
      JSON.stringify({ ...storage, theme: args.theme }),
    );
    console.log(green("Theme stored"));
    process.exit(1);
  } catch (error) {
    console.error(red("✖ ") + "Unable to store theme");
    process.exit(0);
  }
}
