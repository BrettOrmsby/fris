/*
 * Wrapper for Shiki
 */
import { readFile } from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  getHighlighter,
  type BundledLanguage,
  type ThemedToken,
  BundledTheme,
} from "shiki";
import { red } from "kolorist";

// Try to load the code highlight theme
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let file: string;
try {
  file = await readFile(__dirname + "/../storage.json", "utf8");
} catch (error) {
  console.error(red("✖ ") + "Unable to load theme, defaulting to dracula");
}
const theme: BundledTheme = file ? JSON.parse(file).theme : "dracula";

const highlighter = await getHighlighter({ themes: [theme], langs: [] });

/*
 * Tokenize the provided code
 */
export default async function tokenize(
  code: string,
  lang: BundledLanguage,
): Promise<ThemedToken[][]> {
  if (!highlighter.getLoadedLanguages().includes(lang)) {
    await highlighter.loadLanguage(lang);
  }
  return highlighter.codeToTokensBase(code, {
    includeExplanation: true,
    lang,
    theme,
  });
}

/*
 * Provide the colours for the code highlight theme
 */
export function getThemeColours(): Record<string, string> {
  return highlighter.getTheme(theme).colors;
}
