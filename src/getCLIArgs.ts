/*
 * Get all CL args and normalize values into a useable object
 */
import minimist from "minimist";
import prompts from "prompts";
import { Theme } from "shiki";

export type FRISArgs = {
  file: string;
  find: string;
  replace: string;
  scope: string;
  ignore: string;
  picker: boolean;
  regex: boolean;
  all: boolean;
  help: boolean;
  version: boolean;
  theme: Theme;
  lines: number;
};

/*
 * Get the args
 */
export async function getCLIArgs(): Promise<FRISArgs> {
  let argv = normalizeArgs();
  // When running help, version, theme, or lines, the other args are not important
  if (
    argv.help ||
    argv.version ||
    argv.theme ||
    argv.lines ||
    argv.lines === 0
  ) {
    return argv;
  }

  // Run the picker
  if (argv.picker) {
    const responses = await prompts(
      [
        {
          name: "file",
          type: "text",
          message: "File path:",
          initial: argv.file,
        },
        {
          name: "find",
          type: "text",
          message: "Find:",
          initial: argv.find,
        },
        {
          name: "replace",
          type: "text",
          message: "Replace:",
          initial: argv.replace,
        },
        {
          name: "regex",
          type: "toggle",
          message: "Using regex?",
          initial: argv.regex,
          active: "yes",
          inactive: "no",
        },
        {
          name: "scope",
          type: "text",
          message: "Scope: ",
          initial: argv.scope,
        },
        {
          name: "ignore",
          type: "text",
          message: "Ignore: ",
          initial: argv.ignore,
        },
        {
          name: "all",
          type: "toggle",
          message: "Replace all occurrences?",
          initial: argv.all,
          active: "yes",
          inactive: "no",
        },
      ],
      {
        onCancel: () => {
          throw new Error("Operation cancelled");
        },
      },
    );
    argv = { ...argv, ...responses };
    console.log("");
  }

  checkArgErrors(argv);
  return argv;
}

/*
 * Convert the args from the CL to a object
 */
function normalizeArgs(): FRISArgs {
  const normalizedArgs: FRISArgs = {
    file: "",
    find: "",
    replace: "",
    scope: "",
    ignore: "",
    picker: false,
    regex: false,
    all: false,
    theme: null,
    lines: null,
    help: false,
    version: false,
  };
  const argv = minimist(process.argv.slice(2), {});
  for (const [key, value] of Object.entries(argv)) {
    switch (key) {
      case "_":
        // Check if missing the required CL arguments
        if (
          !("p" in argv) &&
          !("picker" in argv) &&
          !("h" in argv) &&
          !("help" in argv) &&
          !("t" in argv) &&
          !("theme" in argv) &&
          !("l" in argv) &&
          !("lines" in argv) &&
          !("version" in argv)
        ) {
          if (value.length < 1) {
            // open the help menu
            normalizedArgs.help = true;
            break;
          } else if (value.length < 2) {
            throw new Error(
              "Expected find and replace arguments: ~ fris <file> <find> <replace>",
            );
          } else if (value.length < 3) {
            throw new Error(
              "Expected a replace argument: ~ fris <file> <find> <replace>",
            );
          }
        }
        normalizedArgs.file = value[0] ? value[0].toString() : "";
        normalizedArgs.find = value[1] ? value[1].toString() : "";
        normalizedArgs.replace = value[2] ? value[2].toString() : "";
        break;
      case "p":
      case "picker":
        normalizedArgs.picker = true;
        break;
      case "s":
      case "scope":
        normalizedArgs.scope = value.toString();
        break;
      case "i":
      case "ignore":
        normalizedArgs.ignore = value.toString();
        break;
      case "r":
      case "regex":
        normalizedArgs.regex = true;
        break;
      case "a":
      case "all":
        normalizedArgs.all = true;
        break;
      case "h":
      case "help":
        normalizedArgs.help = true;
        break;
      case "t":
      case "theme":
        normalizedArgs.theme = value.toString() as Theme;
        break;
      case "l":
      case "lines":
        normalizedArgs.lines = parseInt(value);
        break;
      case "version":
        normalizedArgs.version = true;
        break;
      default:
        break;
    }
  }
  return normalizedArgs;
}

/*
 * Check for any errors in the arguments
 */
function checkArgErrors(argv: FRISArgs) {
  if (argv.regex) {
    try {
      new RegExp(argv.find);
    } catch (e) {
      throw new Error("Invalid find regex: " + e.message);
    }
  }
}
