import { createWriteStream, readdirSync } from "node:fs";
import path, { resolve } from "node:path";
import { run } from "node:test";
import { junit, spec } from "node:test/reporters";

const SRC_DIR = resolve("src");

const TEST_STREAM = run({
  concurrency: true,
  files: findFiles(SRC_DIR, (name) => name.endsWith(".spec.ts")),
})
  .once("test:fail", () => {
    process.exitCode = 1;
  })
  .once("readable", () => {
    console.log("running unit tests");
  })
  .once("end", () => {
    console.log("unit tests done");
  });

TEST_STREAM.compose(junit).pipe(createWriteStream("unit.xml", "utf-8"));
TEST_STREAM.pipe(spec()).pipe(process.stdout);

/**
 * Recursively returns all files in the given directory that match the provided filename filter.
 *
 * @param dir - the entry directory
 * @param filter - the filename filter
 * @returns all matching files
 */
export function findFiles(dir: string, filter: (filename: string) => boolean): string[] {
  const files = readdirSync(dir, { withFileTypes: true });
  let testFiles: string[] = [];
  for (const file of files) {
    const fullPath = path.join(dir, file.name);
    if (file.isDirectory()) {
      testFiles = testFiles.concat(findFiles(fullPath, filter));
    } else if (file.isFile() && filter(file.name)) {
      testFiles.push(fullPath);
    }
  }
  return testFiles;
}
