/*
 * Wrapper for Shiki
 */

import { getHighlighter, type Lang, type IThemedToken } from "shiki";

const highlighter = await getHighlighter({});
await highlighter.loadTheme("dracula");

/*
 * Tokenize the provided code
 */
export default function tokenize(code: string, lang: Lang): IThemedToken[][] {
  return highlighter.codeToThemedTokens(code, lang, "dracula");
}

/*
 * Provide the colours for the code highlighter
 */
export function getThemeColours(): Record<string, string> {
  return highlighter.getTheme("dracula").colors;
}
