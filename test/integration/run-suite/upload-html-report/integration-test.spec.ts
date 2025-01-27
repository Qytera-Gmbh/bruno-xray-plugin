import assert from "node:assert";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { describe, it } from "node:test";
import { runPlugin } from "../../../sh.js";
import { getActualTestExecutionIssueKey, getIntegrationClient } from "../../util.js";

interface TestCase {
  expectedReportName: string;
  linkedTest: string;
  projectDirectory: string;
  projectKey: string;
  service: "cloud" | "server";
  title: string;
}

const TESTS: TestCase[] = [
  {
    expectedReportName: "results.html",
    linkedTest: "BRU-65",
    projectDirectory: join(import.meta.dirname),
    projectKey: "BRU",
    service: "cloud",
    title: "html report can be uploaded as evidence",
  },
];

describe(relative(cwd(), import.meta.filename), { timeout: 180000 }, async () => {
  for (const test of TESTS) {
    await it(test.title, async () => {
      const output = runPlugin(
        ["run-suite", "./suite.mjs", "--collection-directory", "collection"],
        {
          cwd: test.projectDirectory,
          includeDefaultEnv: test.service,
        }
      );

      const testExecutionIssueKey = getActualTestExecutionIssueKey(test.projectKey, output);

      if (test.service === "cloud") {
        const searchResult = await getIntegrationClient(
          "jira",
          "cloud"
        ).issueSearch.searchForIssuesUsingJql({
          fields: ["id", "summary", "description"],
          jql: `issue in (${testExecutionIssueKey}, ${test.linkedTest}) ORDER BY key DESC`,
        });
        assert.ok(searchResult.issues);
        const testResults = await getIntegrationClient("xray", "cloud").getTestRunResults({
          testExecIssueIds: [searchResult.issues[0].id],
          testIssueIds: [searchResult.issues[1].id],
        });
        assert.strictEqual(testResults.length, 1);
        assert.ok(testResults[0].evidence);
        assert.ok(
          testResults[0].evidence.some((evidence) => evidence.filename === test.expectedReportName)
        );
      }
    });
  }
});
