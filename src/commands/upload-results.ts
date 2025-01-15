import { Args, Command, Flags } from "@oclif/core";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { convertBrunoToXray } from "../conversion/conversion.js";
import type { BrunoIteration } from "../model/bruno-model.js";
import { XrayClient } from "../rest/xray.js";

enum Flag {
  CSV_FILE = "csv-file",
  DESCRIPTION = "description",
  JIRA_TOKEN = "jira-token",
  JIRA_URL = "jira-url",
  PROJECT_KEY = "project-key",
  SUMMARY = "summary",
  TEST_EXECUTION = "test-execution",
  XRAY_CLIENT_ID = "xray-client-id",
  XRAY_CLIENT_SECRET = "xray-client-secret",
}

enum HelpGroup {
  AUTHENTICATION = "AUTHENTICATION",
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
    [Flag.CSV_FILE]: Flags.string({
      description:
        "a CSV file which was used for data-driven Bruno execution and will be mapped to Xray's iterations",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.DESCRIPTION]: Flags.string({
      default: "Generated from Bruno JSON report",
      description: "the description of the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.JIRA_TOKEN]: Flags.string({
      description: "the Jira API token",
      env: "JIRA_TOKEN",
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
    [Flag.JIRA_URL]: Flags.string({
      description: "the Jira URL",
      required: true,
    }),
    [Flag.PROJECT_KEY]: Flags.string({
      description: "the Jira project key where new test execution issues will be created",
      required: true,
    }),
    [Flag.SUMMARY]: Flags.string({
      default: "Bruno test execution",
      description: "the summary of the test execution issue",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.TEST_EXECUTION]: Flags.string({
      description: "an existing Jira test execution issue to upload the test results to",
      helpGroup: HelpGroup.TEST_EXECUTION_ISSUE,
    }),
    [Flag.XRAY_CLIENT_ID]: Flags.string({
      dependsOn: [Flag.XRAY_CLIENT_SECRET],
      description: "the Xray Cloud client ID",
      env: "XRAY_CLIENT_ID",
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
    [Flag.XRAY_CLIENT_SECRET]: Flags.string({
      dependsOn: [Flag.XRAY_CLIENT_ID],
      description: "the Xray Cloud client secret",
      env: "XRAY_CLIENT_SECRET",
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { results },
      flags: {
        [Flag.CSV_FILE]: csvFile,
        [Flag.DESCRIPTION]: description,
        [Flag.JIRA_TOKEN]: jiraToken,
        [Flag.JIRA_URL]: jiraUrl,
        [Flag.PROJECT_KEY]: projectKey,
        [Flag.SUMMARY]: summary,
        [Flag.TEST_EXECUTION]: testExecution,
        [Flag.XRAY_CLIENT_ID]: xrayClientId,
        [Flag.XRAY_CLIENT_SECRET]: xrayClientSecret,
      },
    } = await this.parse(UploadResults);

    const brunoResults: BrunoIteration[] = JSON.parse(
      readFileSync(results, "utf-8")
    ) as BrunoIteration[];

    // Choose Xray server or cloud depending on the provided option combinations.
    const isCloudProject = xrayClientId !== undefined && xrayClientSecret !== undefined;
    let xrayClient: XrayClient;

    if (isCloudProject) {
      xrayClient = new XrayClient({ clientId: xrayClientId, clientSecret: xrayClientSecret });
    } else {
      if (jiraToken === undefined) {
        throw new Error(
          `One of [--${Flag.XRAY_CLIENT_ID} ... --${Flag.XRAY_CLIENT_SECRET} ...] or [--${Flag.JIRA_TOKEN} ... --${Flag.JIRA_URL} ...] must be provided`
        );
      }
      xrayClient = new XrayClient({ baseUrl: jiraUrl, token: jiraToken });
    }

    let parameters: Record<string, string>[] | undefined = undefined;
    if (csvFile) {
      parameters = parse(readFileSync(join(cwd(), csvFile), "utf-8"), {
        columns: true,
        ["skip_empty_lines"]: true,
      }) as Record<string, string>[];
    }

    const xrayResults = convertBrunoToXray(brunoResults, {
      description,
      parameters,
      summary,
      testExecution,
      useCloudFormat: isCloudProject,
    });

    if (!xrayResults.tests || xrayResults.tests.length === 0) {
      throw new Error("No Xray tests found in Bruno JSON");
    }

    const response = await xrayClient.importExecution(xrayResults, projectKey);

    this.log(JSON.stringify(response, null, 2));
  }
}
