/*
 * Find all matching indices of a pattern on code
 */
import globToRegex from "./globToRegex.js";
import tokenize from "./tokenize.js";
import { escapeStringToRegex } from "./utils.js";
import type { Lang } from "shiki";

// Interfaces copied from shiki as they are not exported
interface IThemedTokenScopeExplanation {
  scopeName: string;
  themeMatches: any[];
}
interface IThemedTokenExplanation {
  content: string;
  scopes: IThemedTokenScopeExplanation[];
}

export type FindOptions = {
  lang: Lang;
  scope?: string;
  ignore?: string;
};

export type Pos = {
  line: number;
  character: number;
};
export type FindResult = {
  start: Pos;
  end: Pos;
};

export default function find(
  code: string,
  pattern: string | RegExp,
  options: FindOptions,
): FindResult[] {
  const results: FindResult[] = [];
  const tokens = tokenize(code, options.lang);

  // Keep track of positions
  let linePos = -1;
  let charPos = -1;
  for (const line of tokens) {
    linePos += 1;
    charPos = 0;
    for (const token of line) {
      // Check if the token matches the scopes
      const matchesScope =
        (options.scope &&
          explanationMatchesScopePattern(token.explanation, options.scope)) ||
        !options.scope;
      const matchesIgnore =
        options.ignore &&
        explanationMatchesScopePattern(token.explanation, options.ignore);
      if (matchesScope && !matchesIgnore) {
        // Get any matches
        const matches = [
          ...token.content.matchAll(
            typeof pattern === "string"
              ? escapeStringToRegex(pattern, "g")
              : new RegExp(pattern, pattern.flags + "g"),
          ),
        ];

        // Add all matches to the return results value
        matches.forEach((match) => {
          results.push({
            start: {
              character: charPos + match.index,
              line: linePos,
            },
            end: {
              character: charPos + match.index + match[0].length,
              line: linePos,
            },
          });
        });
      }
      charPos += token.content.length;
    }
  }

  return results;
}

/*
 * Function to check if a token explanation has a scope that matches a pattern
 */
function explanationMatchesScopePattern(
  explanations: IThemedTokenExplanation[],
  pattern: string,
): boolean {
  if (!explanations) {
    return false;
  }
  for (const explanation of explanations) {
    for (const scopeExplanation of explanation.scopes) {
      if (globToRegex(pattern).test(scopeExplanation.scopeName)) {
        return true;
      }
    }
  }
  return false;
}
