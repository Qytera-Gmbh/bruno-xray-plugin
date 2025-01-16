import assert from "node:assert";
import { readFileSync } from "node:fs";
import path, { join } from "node:path";
import { describe, it } from "node:test";
import type { BrunoIteration } from "../model/bruno-model.js";
import { convertBrunoToXray } from "./conversion.js";

describe(path.relative(process.cwd(), import.meta.filename), () => {
  describe("test execution reuse", () => {
    it("adds the test execution issue key", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-single-folder.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, { testExecution: "ABC-123" });
      assert.deepStrictEqual(convertedResults.testExecutionKey, "ABC-123");
    });
  });

  describe("single folder", () => {
    it("converts iterated results without parameters", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-single-folder.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, { useCloudFormat: true });
      assert.deepStrictEqual(
        convertedResults,
        JSON.parse(
          readFileSync(
            join(import.meta.dirname, "test", "iterated-single-folder-no-parameters-expected.json"),
            "utf-8"
          )
        ) as BrunoIteration[]
      );
    });

    it("converts iterated results with parameters", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-single-folder.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, {
        parameters: [
          { language: "en", name: "Jeff" },
          { language: "en", name: "George" },
          { language: "en", name: "Bob" },
          { language: "en", name: "Rob" },
          { language: "de", name: "Rob" },
          { language: "en", name: "Mary" },
        ],
        useCloudFormat: true,
      });
      assert.deepStrictEqual(
        convertedResults,
        JSON.parse(
          readFileSync(
            join(
              import.meta.dirname,
              "test",
              "iterated-single-folder-with-parameters-expected.json"
            ),
            "utf-8"
          )
        ) as BrunoIteration[]
      );
    });

    it("handles connection refused results", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-connection-refused.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, { useCloudFormat: true });
      assert.deepStrictEqual(
        convertedResults,
        JSON.parse(
          readFileSync(
            join(import.meta.dirname, "test", "iterated-connection-refused-expected.json"),
            "utf-8"
          )
        ) as BrunoIteration[]
      );
    });
  });

  describe("two folders", () => {
    it("converts iterated results without parameters", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-two-folders.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, { useCloudFormat: false });
      assert.deepStrictEqual(
        convertedResults,
        JSON.parse(
          readFileSync(
            join(import.meta.dirname, "test", "iterated-two-folders-no-parameters-expected.json"),
            "utf-8"
          )
        ) as BrunoIteration[]
      );
    });

    it("converts iterated results with parameters", () => {
      const results = JSON.parse(
        readFileSync(join(import.meta.dirname, "test", "iterated-two-folders.json"), "utf-8")
      ) as BrunoIteration[];
      const convertedResults = convertBrunoToXray(results, {
        parameters: [
          { language: "en", name: "Jeff" },
          { language: "en", name: "George" },
          { language: "en", name: "Bob" },
          { language: "en", name: "Rob" },
          { language: "de", name: "Rob" },
          { language: "en", name: "Mary" },
        ],
        useCloudFormat: false,
      });
      assert.deepStrictEqual(
        convertedResults,
        JSON.parse(
          readFileSync(
            join(import.meta.dirname, "test", "iterated-two-folders-with-parameters-expected.json"),
            "utf-8"
          )
        ) as BrunoIteration[]
      );
    });
  });
});
