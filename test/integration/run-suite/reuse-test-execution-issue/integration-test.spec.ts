import assert from "node:assert";
import { join, relative } from "node:path";
import { cwd } from "node:process";
import { describe, it } from "node:test";
import { runPlugin } from "../../../sh.js";
import { getActualTestExecutionIssueKey, getIntegrationClient } from "../../util.js";

interface TestCase {
  expectedDescription: object;
  expectedSummary: string;
  expectedTestExecutionIssueKey: string;
  linkedTest: string;
  projectDirectory: string;
  projectKey: string;
  service: "cloud" | "server";
  title: string;
}

const TESTS: TestCase[] = [
  {
    expectedDescription: {
      content: [
        {
          content: [
            {
              text: "this test execution issue was reused in a config",
              type: "text",
            },
          ],
          type: "paragraph",
        },
      ],
      type: "doc",
      version: 1,
    },
    expectedSummary: "reused test execution issue",
    expectedTestExecutionIssueKey: "BRU-8",
    linkedTest: "BRU-23",
    projectDirectory: join(import.meta.dirname),
    projectKey: "BRU",
    service: "cloud",
    title: "suites can reuse test execution issues in configurations",
  },
];

describe(relative(cwd(), import.meta.filename), { timeout: 180000 }, async () => {
  for (const testCase of TESTS) {
    await it(testCase.title, async () => {
      const output = runPlugin(
        ["run-suite", "./suite.json", "--collection-directory", "collection"],
        {
          cwd: testCase.projectDirectory,
          includeDefaultEnv: testCase.service,
        }
      );

      const testExecutionIssueKey = getActualTestExecutionIssueKey(testCase.projectKey, output);

      assert.strictEqual(testExecutionIssueKey, testCase.expectedTestExecutionIssueKey);

      if (testCase.service === "cloud") {
        const searchResult = await getIntegrationClient(
          "jira",
          "cloud"
        ).issueSearch.searchForIssuesUsingJql({
          fields: ["id", "summary", "description"],
          jql: `issue in (${testExecutionIssueKey}, ${testCase.linkedTest}) ORDER BY key`,
        });
        assert.ok(searchResult.issues);
        assert.strictEqual(searchResult.issues[0].fields.summary, testCase.expectedSummary);
        assert.deepStrictEqual(
          searchResult.issues[0].fields.description,
          testCase.expectedDescription
        );
        const testResults = await getIntegrationClient("xray", "cloud").graphql.getTestRuns.query(
          {
            limit: 1,
            testExecIssueIds: [searchResult.issues[0].id],
            testIssueIds: [searchResult.issues[1].id],
          },
          (testRunResults) => [
            testRunResults.results((testRun) => [
              testRun.test((test) => [test.jira({ fields: ["key"] })]),
            ]),
          ]
        );
        assert.strictEqual(testResults.results?.length, 1);
        assert.deepStrictEqual(testResults.results[0]?.test, {
          jira: {
            key: testCase.linkedTest,
          },
        });
      }
    });
  }
});
