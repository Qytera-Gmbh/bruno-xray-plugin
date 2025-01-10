import assert from "node:assert";
import { readFileSync } from "node:fs";
import path, { join } from "node:path";
import { describe, it } from "node:test";
import type { BrunoIteration } from "../model/bruno-model.js";
import { convertBrunoToXray } from "./conversion.js";

describe(path.relative(process.cwd(), import.meta.filename), () => {
  it("converts iterated results without parameters", () => {
    const results = JSON.parse(
      readFileSync(join(import.meta.dirname, "test", "iterated.json"), "utf-8")
    ) as BrunoIteration[];
    const convertedResults = convertBrunoToXray(results, { useCloudFormat: true });
    assert.deepStrictEqual(
      convertedResults,
      JSON.parse(
        readFileSync(
          join(import.meta.dirname, "test", "iterated-no-parameters-expected.json"),
          "utf-8"
        )
      ) as BrunoIteration[]
    );
  });

  it("converts iterated results with parameters", () => {
    const results = JSON.parse(
      readFileSync(join(import.meta.dirname, "test", "iterated.json"), "utf-8")
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
          join(import.meta.dirname, "test", "iterated-with-parameters-expected.json"),
          "utf-8"
        )
      ) as BrunoIteration[]
    );
  });
});
