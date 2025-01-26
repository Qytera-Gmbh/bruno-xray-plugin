import { readFileSync } from "node:fs";
import path, { join } from "node:path";
import { describe, it } from "node:test";
import type { BrunoIteration } from "../model/bruno-model.js";
import { BrunoAllureReporter } from "./allure.js";

describe(path.relative(process.cwd(), import.meta.filename), () => {
  describe("single iteration", () => {
    it.only("adds the test execution issue key", () => {
      // const file = "iterated-single-folder.json";
      const file = "iterated-two-folders.json";
      // const file = "iterated-connection-refused.json";
      // const file = "content-types.json";
      // const file = "content-types-failing.json";
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "../", "conversion", "test", file), "utf-8")
      ) as BrunoIteration[];
      const reporter = new BrunoAllureReporter({ resultsDir: "./allure-results" });
      for (let i = 0; i < results.length; i++) {
        reporter.addBrunoIteration(results[i], {
          historyId: `result-${i}`,
          name: "DP-90",
          parameters: [{ name: "parameter 1", value: "15" }],
        });
      }
    });
  });
});
