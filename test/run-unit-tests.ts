import { createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { run } from "node:test";
import { junit, spec } from "node:test/reporters";
import { findFiles } from "./util.js";

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
