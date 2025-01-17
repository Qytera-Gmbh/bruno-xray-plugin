import { createWriteStream } from "node:fs";
import { resolve } from "node:path";
import { run } from "node:test";
import { junit, spec } from "node:test/reporters";
import { startServer, stopServer } from "./server.js";
import { findFiles } from "./util.js";

const INTEGRATION_DIR = resolve("test", "integration");

const TEST_STREAM = run({ files: findFiles(INTEGRATION_DIR, (name) => name.endsWith(".spec.ts")) })
  .once("test:fail", () => {
    process.exitCode = 1;
  })
  .once("readable", () => {
    console.log("running integration tests");
    startServer();
  })
  .once("end", () => {
    stopServer();
    console.log("integration tests done");
  });

TEST_STREAM.compose(junit).pipe(createWriteStream("integration.xml", "utf-8"));
TEST_STREAM.pipe(spec()).pipe(process.stdout);
