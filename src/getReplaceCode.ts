/*
 * Create the terminal editor "screenshot" of the code around the result
 */
import { FindResult } from "./find.js";
import tokenize, { getThemeColours } from "./tokenize.js";
import { Lang } from "shiki";
import { ansi256, ansi256Bg } from "kolorist";

// Number of lines to show around the result, recommend a odd number
const NUMBER_LINES_SHOWN = 7;

export default function getReplaceCode(
  code: string,
  lang: Lang,
  result: FindResult,
): string {
  const tokens = tokenize(code, lang);
  const colors = getThemeColours();

  // Get the number of lines surrounding the result
  // Start by trying to go half above and half below
  const numberSurroundingLines = Math.abs(
    Math.ceil((NUMBER_LINES_SHOWN - 1) / 2),
  );
  let startLine = result.start.line - numberSurroundingLines;
  let endLine = result.end.line + numberSurroundingLines;

  // If there were not enough lines above, add the remainder lines below
  if (startLine < 0) {
    endLine += Math.abs(startLine);
    startLine = 0;
  }

  // If there were not enough lines below, add the remainder lines above
  if (endLine > tokens.length - 1) {
    startLine -= endLine - (tokens.length - 1);
    endLine = tokens.length - 1;
    // Show fewer than the preferred number of lines if there are no more available
    if (startLine < 0) {
      startLine = 0;
    }
  }

  // Get theme-specific colours
  const bg = ansi256Bg(hexToANSI256(colors["editor.background"]));
  const matchBackgroundColor = ansi256Bg(
    hexToANSI256(colors["editor.findMatchHighlightBackground"] || "#FFFF00"),
  );
  const lineNumberColor = ansi256(
    hexToANSI256(colors["editorLineNumber.foreground"]),
  );

  // All line numbers need to be padded to have an equal width
  const lineNumberPadding = endLine.toString().length;

  // For some reason the editor has to start with a newline so the first line has a background colour go the full width of the terminal
  let output = "\n";

  // Add each line to the output
  for (let i = startLine; i <= endLine; i++) {
    const line = tokens[i];

    // Add the line number
    output += lineNumberColor(
      " " + (i + 1).toString().padEnd(lineNumberPadding) + " | ",
    );

    // If the line is the one with the result, we need to do additional things
    if (i === result.start.line) {
      let charPos = 0;
      for (const token of line) {
        const color = ansi256(hexToANSI256(token.color));

        // Check if the match is found in this token
        if (
          result.start.character >= charPos &&
          result.end.character <= charPos + token.content.length
        ) {
          // Get certain positions within the token
          const start = token.content.substring(
            0,
            result.start.character - charPos,
          );
          const middle = token.content.substring(
            result.start.character - charPos,
            result.end.character - charPos,
          );
          const end = token.content.substring(result.end.character - charPos);
          // Add the token with the highlighted center to the output
          output += color(start + matchBackgroundColor(middle) + bg(end));
        } else {
          // Add the token as regular
          output += color(token.content);
        }
        charPos += token.content.length;
      }
    } else {
      // Add all the tokens on the line to the output
      for (const token of line) {
        const color = ansi256(hexToANSI256(token.color));
        output += color(token.content);
      }
    }
    // Add a new line if there are still lines to create
    if (i !== endLine) {
      output += "\x1b[K\n";
    }
  }
  return bg(output);
}

/*
 * Convert a hex to a ANSI256 number
 * See https://github.com/Qix-/color-convert/blob/master/conversions.js#L551
 */
function hexToANSI256(hex): number {
  // Convert a hex to rgb, See https://stackoverflow.com/a/39077686
  const hexToRgb = (hex) =>
    hex
      .replace(
        /^#?([a-f\d])([a-f\d])([a-f\d])$/i,
        (m, r, g, b) => "#" + r + r + g + g + b + b,
      )
      .substring(1)
      .match(/.{2}/g)
      .map((x) => parseInt(x, 16));

  const [r, g, b] = hexToRgb(hex);

  if (r >> 4 === g >> 4 && g >> 4 === b >> 4) {
    if (r < 8) {
      return 16;
    }

    if (r > 248) {
      return 231;
    }

    return Math.round(((r - 8) / 247) * 24) + 232;
  }

  const ansi =
    16 +
    36 * Math.round((r / 255) * 5) +
    6 * Math.round((g / 255) * 5) +
    Math.round((b / 255) * 5);

  return ansi;
}
