/*
 * Wrapper for Shiki
 */
import { readFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import { getHighlighter, type Lang, type IThemedToken, Theme } from "shiki";
import { red } from "kolorist";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
let file: string;
try {
  file = await readFile(__dirname + "/storage.json", "utf8");
} catch (error) {
  console.error(red("✖ ") + "Unable to load theme, defaulting to dracula");
}
const theme: Theme = file ? JSON.parse(file).theme : "dracula";

const highlighter = await getHighlighter({});
await highlighter.loadTheme(theme);

/*
 * Tokenize the provided code
 */
export default function tokenize(code: string, lang: Lang): IThemedToken[][] {
  return highlighter.codeToThemedTokens(code, lang, theme);
}

/*
 * Provide the colours for the code highlighter
 */
export function getThemeColours(): Record<string, string> {
  return highlighter.getTheme(theme).colors;
}
