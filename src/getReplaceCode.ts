/*
 * Create the terminal editor "screenshot" of the code around the result
 */
import { FindResult } from "./find.js";
import tokenize, { getThemeColours } from "./tokenize.js";
import { readFile } from "fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "url";
import type { BundledLanguage } from "shiki";
import { ansi256, ansi256Bg, red, trueColor, trueColorBg } from "kolorist";
import supportsColor from "supports-color";

// Load the number of lines to display
const __dirname = path.dirname(fileURLToPath(import.meta.url));
let file: string;
try {
  file = await readFile(__dirname + "/storage.json", "utf8");
} catch (error) {
  console.error(
    red("✖ ") + "Unable to load the number of lines, defaulting to 7",
  );
}
const numberOfLines = file ? JSON.parse(file).lines : 7;

/*
 * Create the highlighted code section
 */
export default async function getReplaceCode(
  code: string,
  lang: BundledLanguage,
  result: FindResult,
): Promise<string> {
  const tokens = await tokenize(code, lang);
  const colors = getThemeColours();

  // Get the number of lines surrounding the result
  let startLine =
    result.start.line - Math.abs(Math.ceil((numberOfLines - 1) / 2));
  let endLine = result.end.line + Math.abs(Math.floor((numberOfLines - 1) / 2));

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
  const bg = getColourFunction(colors["editor.background"], "bg");
  const matchBackgroundColor = getColourFunction(
    colors["editor.findMatchHighlightBackground"] ||
      colors["editor.selectionHighlightBackground"] ||
      "#FFFF00",
    "bg",
    colors["editor.background"],
  );

  const lineNumberColor = getColourFunction(
    colors["editorLineNumber.foreground"],
    "fg",
  );

  // All line numbers need to be padded to have an equal width
  const lineNumberPadding = (endLine + 1).toString().length;

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
        const color = getColourFunction(token.color, "fg");

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
        const color = getColourFunction(token.color, "fg");
        output += color(token.content);
      }
    }

    // Highlight the full line
    output += "\x1b[K";
    // Add a new line if there are still lines to create
    if (i !== endLine) {
      output += "\n";
    }
  }
  return bg(output);
}

/*
 * Get the colour code function from kolorist for a colour
 */
function getColourFunction(
  colour: string,
  position: "fg" | "bg" = "fg",
  background?: string,
): (str: string | number) => string {
  // eslint-disable-next-line
  let [r, g, b, a] = hexToRgb(colour);
  if (a !== 1 && background) {
    const [rBg, gBg, bBG] = hexToRgb(background);
    // blend the background with the colour
    r = Math.round((1 - a) * rBg + a * r);
    g = Math.round((1 - a) * gBg + a * g);
    b = Math.round((1 - a) * bBG + a * b);
    colour = RGBToHex(r, g, b);
  }
  if (supportsColor.stdout && supportsColor.stdout.has16m) {
    return position === "fg" ? trueColor(r, g, b) : trueColorBg(r, g, b);
  }

  return position === "fg"
    ? ansi256(hexToANSI256(colour))
    : ansi256Bg(hexToANSI256(colour));
}

/*
 * Convert a hex to rgb
 */
function hexToRgb(hex: string): [number, number, number, number] {
  hex = hex.replace("#", "");

  let r: number, g: number, b: number, a: number;
  if (hex.length === 3 || hex.length === 4) {
    // Convert shorthand hex to full hex
    hex = hex.replace(/(.)/g, "$1$1");
  }

  if (hex.length === 6) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = 1;
  } else if (hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16);
    g = parseInt(hex.slice(2, 4), 16);
    b = parseInt(hex.slice(4, 6), 16);
    a = parseInt(hex.slice(6, 8), 16) / 255;
  }

  return [r, g, b, a];
}

/*
 * Convert a rgb to hex
 */
function RGBToHex(r, g, b) {
  r = r.toString(16);
  g = g.toString(16);
  b = b.toString(16);

  if (r.length == 1) r = "0" + r;
  if (g.length == 1) g = "0" + g;
  if (b.length == 1) b = "0" + b;

  return "#" + r + g + b;
}

/*
 * Convert a hex to a ANSI256 number
 * See https://github.com/Qix-/color-convert/blob/master/conversions.js#L551
 */
function hexToANSI256(hex): number {
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
