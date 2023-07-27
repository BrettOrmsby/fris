/*
 * Get all CL args and normalize values into a useable object
 */
import * as fs from "node:fs";
import * as path from "node:path";
import minimist from "minimist";
import prompts from "prompts";
import { BUNDLED_LANGUAGES, type Lang } from "shiki";

// Get all supported shiki languages
const allLanguages = BUNDLED_LANGUAGES.map((language) =>
  language.aliases ? [language.id, ...language.aliases] : language.id,
).flat() as Lang[];

export type FRISArgs = {
  file: string;
  language: Lang;
  find: string;
  replace: string;
  scope: string;
  ignore: string;
  picker: boolean;
  regex: boolean;
  all: boolean;
  help: boolean;
  version: boolean;
};

/*
 * Get the args
 */
export async function getCLIArgs(): Promise<FRISArgs> {
  let argv = normalizeArgs();
  // When running help or version, the other args are not important
  if (argv.help || argv.version) {
    return argv;
  }

  // Run the picker
  if (argv.picker) {
    let filepath = "";
    const responses = await prompts(
      [
        {
          name: "file",
          type: "text",
          message: "File path:",
          initial: argv.file,
          validate: (value) =>
            fs.existsSync(path.resolve(process.cwd(), value))
              ? true
              : `File ${path.resolve(process.cwd(), value)} does not exist.`,
          onState: ({ value }) => {
            filepath = path.resolve(process.cwd(), value);
          },
        },
        {
          name: "language",
          type: () =>
            tryGetLanguage(argv.language, filepath.split(".")[1])
              ? null
              : "autocomplete",
          message: "Language",
          choices: allLanguages.map((lang) => {
            return { title: lang };
          }),
          initial: allLanguages[0],
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
  }

  // Try to find the language to use for tokenizing
  argv.language =
    tryGetLanguage(
      argv.language,
      argv.file.split(".")[argv.file.split(".").length - 1],
    ) || argv.language;
  checkArgErrors(argv);
  return argv;
}

/*
 * Convert the args from the CL to a object
 */
function normalizeArgs(): FRISArgs {
  const normalizedArgs: FRISArgs = {
    language: "" as Lang,
    file: "",
    find: "",
    replace: "",
    scope: "",
    ignore: "",
    picker: false,
    regex: false,
    all: false,
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
          !("version" in argv)
        ) {
          if (value.length < 1) {
            throw new Error(
              "Expected file, find and replace argument: ~ fris <file> <find> <replace>",
            );
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
        normalizedArgs.file = "" + value[0] || "";
        normalizedArgs.find = "" + value[1] || "";
        normalizedArgs.replace = "" + value[2] || "";
        break;
      case "p":
      case "picker":
        normalizedArgs.picker = true;
        break;
      case "s":
      case "scope":
        // Convert to string
        normalizedArgs.scope = "" + value;
        break;
      case "i":
      case "ignore":
        // Convert to string
        normalizedArgs.ignore = "" + value;
        break;
      case "r":
      case "regex":
        normalizedArgs.regex = true;
        break;
      case "a":
      case "all":
        normalizedArgs.all = true;
        break;
      case "l":
      case "language":
        normalizedArgs.language = value;
        break;
      case "h":
      case "help":
        normalizedArgs.help = true;
        break;
      case "version":
        normalizedArgs.version = true;
        break;
      default:
        break;
    }
  }
  // Try to predict the language to use for tokenizing
  if (normalizedArgs.file && normalizedArgs.language === ("" as Lang)) {
    if (allLanguages.includes(normalizedArgs.file.split(".")[1] as any)) {
      normalizedArgs.language = normalizedArgs.file.split(".")[1] as Lang;
    }
  }
  return normalizedArgs;
}

/*
 * Try to get the language to use for tokenizing
 */
function tryGetLanguage(langArg: string, fileExtension: string): Lang | void {
  if (allLanguages.includes(langArg as Lang)) {
    return langArg as Lang;
  }
  if (allLanguages.includes(fileExtension as Lang)) {
    return fileExtension as Lang;
  }
  return;
}

/*
 * Check for any errors in the arguments
 */
function checkArgErrors(argv: FRISArgs) {
  if (!fs.existsSync(path.resolve(process.cwd(), argv.file))) {
    throw new Error(
      "No file found at path: " + path.resolve(process.cwd(), argv.file),
    );
  }

  if (
    !tryGetLanguage(
      argv.language,
      argv.file.split(".")[argv.file.split(".").length - 1],
    )
  ) {
    if (argv.language !== ("" as Lang)) {
      throw new Error("Expected a valid language identifier: " + argv.language);
    } else {
      throw new Error(
        "Unknown language for file extension: " +
          argv.file.split(".")[argv.file.split(".").length - 1],
      );
    }
  }

  if (argv.regex) {
    try {
      new RegExp(argv.find);
    } catch (e) {
      throw new Error("Invalid find regex: " + e.message);
    }
  }
}
