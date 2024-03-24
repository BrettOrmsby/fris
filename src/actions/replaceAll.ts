/*
 * Replace all results
 */
import { green, yellow } from "kolorist";
import { FRISArgs } from "../lib/getCLIArgs.js";
import searchFilesForResults from "../lib/searchFilesForResults.js";
import replace from "../lib/replace.js";

export default async function replaceAll(args: FRISArgs) {
  const files = await searchFilesForResults(args);

  if (files.length === 0) {
    console.log(yellow("No Results Found"));
    process.exit(0);
  }

  let successfulReplaceResultCount = 0;
  for (const { code, findResults, filePath } of files) {
    try {
      await replace(args, code, findResults, filePath);
      successfulReplaceResultCount += findResults.length;
    } catch (e) {
      console.error(e.message);
    }
  }
  const totalResults = files.reduce(
    (prev, file) => prev + file.findResults.length,
    0,
  );
  console.log(
    green(
      `Replaced ${successfulReplaceResultCount}/${totalResults} Result${
        totalResults === 1 ? "" : "s"
      }`,
    ),
  );
  process.exit(0);
}
