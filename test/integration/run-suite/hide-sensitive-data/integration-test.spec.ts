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

const TESTS: TestCase[] = [
  {
    linkedTest: "BRU-84",
    projectDirectory: join(import.meta.dirname),
    projectKey: "BRU",
    service: "cloud",
    title: "sensitive data is masked in evidence",
  },
];

describe(relative(cwd(), import.meta.filename), { timeout: 180000 }, async () => {
  for (const test of TESTS) {
    await it(test.title, async () => {
      const output = runPlugin(
        [
          "run-suite",
          "./suite.mjs",
          "--collection-directory",
          "collection",
          "--mask-value",
          '"SecretName"',
          "--mask-value",
          '"SecretNameAgain"',
        ],
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
        const xrayClient = getIntegrationClient("xray", "cloud");
        const testResults = await xrayClient.getTestRunResults({
          testExecIssueIds: [searchResult.issues[0].id],
          testIssueIds: [searchResult.issues[1].id],
        });
        assert.strictEqual(testResults.length, 1);
        assert.strictEqual(testResults[0].evidence?.length, 4);
        assert.ok(testResults[0].evidence[0].id);
        assert.ok(testResults[0].evidence[1].id);
        assert.ok(testResults[0].evidence[2].id);
        assert.ok(testResults[0].evidence[3].id);
        const htmlReport = await xrayClient.downloadAttachment(testResults[0].evidence[0].id);
        const iteration1 = await xrayClient.downloadAttachment(testResults[0].evidence[1].id);
        const iteration2 = await xrayClient.downloadAttachment(testResults[0].evidence[2].id);
        const iteration3 = await xrayClient.downloadAttachment(testResults[0].evidence[3].id);

        for (const evidence of [htmlReport, iteration1]) {
          assert.ok(
            evidence.includes("S********e"),
            `expected masked SecretName to appear in ${evidence}`
          );
          assert.ok(
            !evidence.includes("SecretName"),
            `expected unmasked SecretName not to appear in ${evidence}`
          );
        }

        for (const evidence of [htmlReport, iteration2]) {
          assert.ok(
            evidence.includes("PublicName"),
            `expected unmasked PublicName to appear in ${evidence}`
          );
        }

        for (const evidence of [htmlReport, iteration3]) {
          assert.ok(
            evidence.includes("S*************n"),
            `expected masked SecretNameAgain to appear in ${evidence}`
          );
          assert.ok(
            !evidence.includes("SecretNameAgain"),
            `expected unmasked SecretNameAgain not to appear in ${evidence}`
          );
        }
      }
    });
  }
});
