import { Args, Command, Flags } from "@oclif/core";
import type { Xray } from "@qytera/xray-client";
import { XrayClientCloud, XrayClientServer } from "@qytera/xray-client";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { convertBrunoToXray } from "../../conversion/conversion.js";
import type { BrunoIteration } from "../../model/bruno-model.js";
import type { PluginTestSuite } from "../../model/plugin-model.js";
import { envName } from "../../util/env.js";

import "dotenv/config";

enum Flag {
  BRUNO_HTML_REPORT = "bruno-html-report",
  CSV_FILE = "csv-file",
  JIRA_TOKEN = "jira-token",
  JIRA_URL = "jira-url",
  MASK_VALUE = "mask-value",
  PROJECT_KEY = "project-key",
  TEST_EXECUTION_DESCRIPTION = "test-execution-description",
  TEST_EXECUTION_KEY = "test-execution-key",
  TEST_EXECUTION_REVISION = "test-execution-revision",
  TEST_EXECUTION_SUMMARY = "test-execution-summary",
  TEST_EXECUTION_TEST_ENVIRONMENT = "test-execution-test-environment",
  TEST_EXECUTION_TEST_PLAN_KEY = "test-execution-test-plan-key",
  TEST_EXECUTION_USER = "test-execution-user",
  TEST_EXECUTION_VERSION = "test-execution-version",
  TEST_KEY = "test-key",
  XRAY_CLIENT_ID = "xray-client-id",
  XRAY_CLIENT_SECRET = "xray-client-secret",
}

enum HelpGroup {
  AUTHENTICATION = "AUTHENTICATION",
  REPORTING = "REPORTING",
  TEST_EXECUTION_ISSUE = "TEST EXECUTION ISSUE",
}

export default class UploadResults extends Command {
  static override args = {
    results: Args.string({
      description: "the Bruno JSON results",
      required: true,
    }),
  };

  static override description =
    "Converts Bruno JSON results to Xray JSON and uploads them to a Jira project.";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    [Flag.BRUNO_HTML_REPORT]: Flags.string({
      description: "the Bruno HTML report file to upload as evidence",
      helpGroup: HelpGroup.REPORTING,
    }),
    [Flag.CSV_FILE]: Flags.string({
      description:
        "a CSV file which was used for data-driven Bruno execution and will be mapped to Xray's iterations",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.JIRA_TOKEN]: Flags.string({
      description: "the Jira API token",
      env: envName("jira-token"),
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
    [Flag.JIRA_URL]: Flags.string({
      description: "the Jira URL",
      required: true,
    }),
    [Flag.MASK_VALUE]: Flags.string({
      description: "a sensitive value to mask in uploaded evidence",
      helpGroup: HelpGroup.REPORTING,
      multiple: true,
      multipleNonGreedy: true,
    }),
    [Flag.PROJECT_KEY]: Flags.string({
      description: "the Jira project key where new test execution issues will be created",
      required: true,
    }),
    [Flag.TEST_EXECUTION_DESCRIPTION]: Flags.string({
      default: "Generated from Bruno JSON report",
      description: "the description for the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_KEY]: Flags.string({
      description: "an existing Jira test execution issue to upload the test results to",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_REVISION]: Flags.string({
      description: "a revision for the revision custom field",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_SUMMARY]: Flags.string({
      default: "Bruno test execution",
      description: "the summary of the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_TEST_ENVIRONMENT]: Flags.string({
      description: "Xray test execution environments to assign the test execution issue to",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
      multiple: true,
      multipleNonGreedy: true,
    }),
    [Flag.TEST_EXECUTION_TEST_PLAN_KEY]: Flags.string({
      description: "the test plan key for associating the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_USER]: Flags.string({
      description: "the username for the Jira user who executed the tests",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION_VERSION]: Flags.string({
      description: "the version name for the fix version field of the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_KEY]: Flags.string({
      description: "the Jira test issue to attribute the test results to",
      required: true,
    }),
    [Flag.XRAY_CLIENT_ID]: Flags.string({
      dependsOn: [Flag.XRAY_CLIENT_SECRET],
      description: "the Xray Cloud client ID",
      env: envName("xray-client-id"),
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
    [Flag.XRAY_CLIENT_SECRET]: Flags.string({
      dependsOn: [Flag.XRAY_CLIENT_ID],
      description: "the Xray Cloud client secret",
      env: envName("xray-client-secret"),
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { results },
      flags: {
        [Flag.BRUNO_HTML_REPORT]: brunoHtmlReport,
        [Flag.CSV_FILE]: csvFile,
        [Flag.JIRA_TOKEN]: jiraToken,
        [Flag.JIRA_URL]: jiraUrl,
        [Flag.MASK_VALUE]: maskedValues,
        [Flag.PROJECT_KEY]: projectKey,
        [Flag.TEST_EXECUTION_DESCRIPTION]: testExecutionDescription,
        [Flag.TEST_EXECUTION_KEY]: testExecutionKey,
        [Flag.TEST_EXECUTION_REVISION]: testExecutionRevision,
        [Flag.TEST_EXECUTION_SUMMARY]: testExecutionSummary,
        [Flag.TEST_EXECUTION_TEST_ENVIRONMENT]: testExecutionTestEnvironments,
        [Flag.TEST_EXECUTION_TEST_PLAN_KEY]: testExecutionTestPlanKey,
        [Flag.TEST_EXECUTION_USER]: testExecutionUser,
        [Flag.TEST_EXECUTION_VERSION]: testExecutionVersion,
        [Flag.TEST_KEY]: testKey,
        [Flag.XRAY_CLIENT_ID]: xrayClientId,
        [Flag.XRAY_CLIENT_SECRET]: xrayClientSecret,
      },
    } = await this.parse(UploadResults);
    const testExecutionDetails: Xray.Import.TestExecutionInfo = {
      description: testExecutionDescription,
      revision: testExecutionRevision,
      summary: testExecutionSummary,
      testEnvironments: testExecutionTestEnvironments,
      testPlanKey: testExecutionTestPlanKey,
      user: testExecutionUser,
      version: testExecutionVersion,
    };
    const response = await uploadResults({
      csvFile,
      jiraToken,
      jiraUrl,
      maskedValues,
      projectKey,
      results: { htmlFile: brunoHtmlReport, jsonFile: results },
      testExecution: {
        details: testExecutionDetails,
        key: testExecutionKey,
      },
      testKey,
      xrayClientId,
      xrayClientSecret,
    });
    this.log(JSON.stringify(response, null, 2));
  }
}

export async function uploadResults(options: {
  csvFile?: string;
  jiraToken?: string;
  jiraUrl: string;
  maskedValues?: string[];
  projectKey: string;
  results: {
    htmlFile?: string;
    jsonFile: string;
  };
  testExecution?: PluginTestSuite["config"]["jira"]["testExecution"];
  testKey: string;
  xrayClientId?: string;
  xrayClientSecret?: string;
}) {
  const brunoResults: BrunoIteration[] = JSON.parse(
    readFileSync(options.results.jsonFile, "utf-8")
  ) as BrunoIteration[];

  // Choose Xray server or cloud depending on the provided option combinations.
  let xrayClient;
  if (options.xrayClientId !== undefined && options.xrayClientSecret !== undefined) {
    xrayClient = new XrayClientCloud({
      credentials: {
        clientId: options.xrayClientId,
        clientSecret: options.xrayClientSecret,
      },
      url: "https://xray.cloud.getxray.app",
    });
  } else {
    if (options.jiraToken === undefined) {
      throw new Error(
        `One of [--${Flag.XRAY_CLIENT_ID} ... --${Flag.XRAY_CLIENT_SECRET} ...] or [--${Flag.JIRA_TOKEN} ... --${Flag.JIRA_URL} ...] must be provided`
      );
    }
    xrayClient = new XrayClientServer({
      credentials: { token: options.jiraToken },
      url: options.jiraUrl,
    });
  }
  let parameters: Record<string, string>[] | undefined = undefined;
  if (options.csvFile) {
    parameters = parse(readFileSync(options.csvFile, "utf-8"), {
      columns: true,
      ["skip_empty_lines"]: true,
    }) as Record<string, string>[];
  }

  const xrayResults = convertBrunoToXray(brunoResults, {
    evidence: {
      htmlReportFile: options.results.htmlFile,
    },
    maskedValues: options.maskedValues,
    parameters,
    testExecution: {
      details: options.testExecution?.details,
      key: options.testExecution?.key,
    },
    testKey: options.testKey,
    useCloudFormat: options.xrayClientId !== undefined && options.xrayClientSecret !== undefined,
  });

  if (!xrayResults.tests || xrayResults.tests.length === 0) {
    throw new Error("No Xray tests found in Bruno JSON");
  }

  return await xrayClient.import.execution.xray(xrayResults);
}
