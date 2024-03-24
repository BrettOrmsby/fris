/*
 * Find the files matching the args file glob that also have results
 */
import * as path from "path";
import { readFile } from "fs/promises";
import { BundledLanguage, bundledLanguages } from "shiki";
import { sync } from "glob";
import { link, red } from "kolorist";
import prompts from "prompts";
import { findWithArgs, FindResult } from "../lib/find.js";
import { FRISArgs } from "./getCLIArgs.js";

export type CodeSearchFile = {
  fileName: string;
  filePath: string;
  code: string;
  language: BundledLanguage;
  findResults: FindResult[];
};

export default async function searchFilesForResults(
  args: FRISArgs,
): Promise<CodeSearchFile[]> {
  // Get all supported shiki languages
  const allLanguages = Object.keys(bundledLanguages) as BundledLanguage[];

  // Get all matching files with results
  const files: CodeSearchFile[] = [];

  for (const file of sync(args.file)) {
    const fullFile = path.resolve(process.cwd(), file);

    // Read the code from the file
    let code: string;
    try {
      code = await readFile(fullFile, "utf8");
    } catch (error) {
      console.error(
        `${red("✖ ")} Unable to read file: ${link(file, fullFile)}, ${
          error.message
        }`,
      );
      process.exit(1);
    }

    // Get the shiki language using the file extension or by prompting
    let language;

    const fileExtension = fullFile.match(/\.([^.]+)$/)?.[1];
    if (allLanguages.includes(fileExtension as BundledLanguage)) {
      language = fileExtension;
    } else {
      language = (
        await prompts([
          {
            name: "language",
            type: "autocomplete",
            message: `Enter the language to use when finding and replacing in ${file}: `,
            choices: allLanguages.map((language) => {
              return { title: language };
            }),
            initial: allLanguages[0],
          },
        ])
      ).language;
    }

    const findResults = await findWithArgs(code, language, args);
    if (findResults.length > 0) {
      files.push({
        fileName: file,
        filePath: fullFile,
        code,
        language,
        findResults,
      });
    }
  }
  return files;
}
