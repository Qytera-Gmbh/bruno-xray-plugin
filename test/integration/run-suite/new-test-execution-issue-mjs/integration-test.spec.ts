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
  for (const testCase of [
    {
      linkedTest: "BRU-10",
      projectDirectory: join(import.meta.dirname),
      projectKey: "BRU",
      service: "cloud",
      title: "suites can be configured in mjs files",
    },
  ] as TestCase[]) {
    await it(testCase.title, async () => {
      const output = runPlugin(
        ["run-suite", "./suite.mjs", "--collection-directory", "collection"],
        {
          cwd: testCase.projectDirectory,
          includeDefaultEnv: testCase.service,
        }
      );

      const testExecutionIssueKey = getActualTestExecutionIssueKey(testCase.projectKey, output);

      if (testCase.service === "cloud") {
        const searchResult = await getIntegrationClient(
          "jira",
          "cloud"
        ).issueSearch.searchForIssuesUsingJql({
          fields: ["id"],
          jql: `issue in (${testExecutionIssueKey}, ${testCase.linkedTest})`,
        });
        assert.ok(searchResult.issues);
        const testResults = await getIntegrationClient("xray", "cloud").graphql.getTestRuns.query(
          {
            limit: 1,
            testExecIssueIds: [searchResult.issues[0].id],
            testIssueIds: [searchResult.issues[1].id],
          },
          (testRunResults) => [
            testRunResults.results((testRun) => [
              testRun.status((status) => [status.name]),
              testRun.test((test) => [test.jira({ fields: ["key"] })]),
            ]),
          ]
        );
        assert.strictEqual(testResults.results?.length, 1);
        assert.deepStrictEqual(testResults.results[0]?.status, { name: "PASSED" });
        assert.deepStrictEqual(testResults.results[0].test, {
          jira: {
            key: testCase.linkedTest,
          },
        });
      }
    });
  }
});
