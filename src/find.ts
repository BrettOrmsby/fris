/*
 * Find all matching indices of a pattern on code
 */
import globToRegex from "./globToRegex.js";
import tokenize from "./tokenize.js";
import { escapeStringToRegex } from "./utils.js";
import type { BundledLanguage, ThemedTokenExplanation } from "shiki";

export type FindOptions = {
  lang: BundledLanguage;
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

export default async function find(
  code: string,
  pattern: string | RegExp,
  options: FindOptions,
): Promise<FindResult[]> {
  const results: FindResult[] = [];
  const tokens = await tokenize(code, options.lang);

  const findRegex =
    typeof pattern === "string"
      ? escapeStringToRegex(pattern, "g")
      : new RegExp(pattern, pattern.flags + "g");

  const scope = options.scope ? globToRegex(options.scope) : /^.*$/;
  // /^\b\B$/ matches nothing
  const ignore = options.ignore ? globToRegex(options.ignore) : /^\b\B$/;

  // Keep track of positions
  let linePos = -1;
  let charPos = -1;
  for (const line of tokens) {
    linePos += 1;
    charPos = 0;
    for (const token of line) {
      const matchesScope = explanationMatchesScopePattern(
        token.explanation,
        scope,
      );
      const matchesIgnore = explanationMatchesScopePattern(
        token.explanation,
        ignore,
      );
      if (matchesScope && !matchesIgnore) {
        // Get any matches
        const matches = [...token.content.matchAll(findRegex)];
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
  explanations: ThemedTokenExplanation[],
  pattern: RegExp,
): boolean {
  if (!explanations) {
    return false;
  }
  for (const explanation of explanations) {
    for (const scopeExplanation of explanation.scopes) {
      if (pattern.test(scopeExplanation.scopeName)) {
        return true;
      }
    }
  }
  return false;
}
