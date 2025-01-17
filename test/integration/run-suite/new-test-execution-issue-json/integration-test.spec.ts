import assert from "node:assert";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { describe, it } from "node:test";
import { runPlugin } from "../../../sh.js";
import { getActualTestExecutionIssueKey, getIntegrationClient } from "../../util.js";

interface TestCase {
  linkedTest: string;
  projectDirectory: string;
  projectKey: string;
  service: "cloud" | "server";
  title: string;
}

describe(relative(cwd(), import.meta.filename), { timeout: 180000 }, async () => {
  for (const test of [
    {
      linkedTest: "BRU-16",
      projectDirectory: join(import.meta.dirname),
      projectKey: "BRU",
      service: "cloud",
      title: "suites can be configured in mjs files",
    },
  ] as TestCase[]) {
    await it(test.title, async () => {
      const output = runPlugin(
        ["run-suite", "./suite.json", "--collection-directory", "collection"],
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
          fields: ["id"],
          jql: `issue in (${testExecutionIssueKey}, ${test.linkedTest})`,
        });
        assert.ok(searchResult.issues);
        assert.ok(searchResult.issues[0].id);
        assert.ok(searchResult.issues[1].id);
        const testResults = await getIntegrationClient("xray", "cloud").getTestRunResults({
          testExecIssueIds: [searchResult.issues[0].id],
          testIssueIds: [searchResult.issues[1].id],
        });
        assert.strictEqual(testResults.length, 1);
        assert.deepStrictEqual(testResults[0].status, { name: "PASSED" });
        assert.deepStrictEqual(testResults[0].test, {
          jira: {
            key: test.linkedTest,
          },
        });
      }
    });
  }
});
