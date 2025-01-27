import assert from "node:assert";
import path from "node:path";
import { describe, it } from "node:test";
import { maskSensitiveValues } from "./security.js";

describe(path.relative(process.cwd(), import.meta.filename), () => {
  describe("all-stars-except-first-last", () => {
    it("masks single values", () => {
      const input = "hello my name is secret";
      const output = maskSensitiveValues(input, ["secret"]);
      assert.deepStrictEqual(output, "hello my name is s****t");
    });

    it("masks multiple values", () => {
      const input = "hello my name is secret, and this secretName one is secret too";
      const output = maskSensitiveValues(input, ["secret", "secretName"]);
      assert.deepStrictEqual(
        output,
        "hello my name is s****t, and this s********e one is s****t too"
      );
    });
  });
});
