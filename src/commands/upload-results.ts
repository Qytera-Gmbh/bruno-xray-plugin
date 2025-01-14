import { Args, Command, Flags } from "@oclif/core";
import { parse } from "csv-parse/sync";
import { readFileSync } from "fs";
import { join } from "path";
import { cwd } from "process";
import { convertBrunoToXray } from "../conversion/conversion.js";
import type { BrunoIteration } from "../model/bruno-model.js";
import { importExecution } from "../rest/xray.js";

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
    ["csv-file"]: Flags.string({
      description:
        "a CSV file which was used for data-driven Bruno execution and will be mapped to Xray's iterations",
      helpGroup: "TEST EXECUTION ISSUE",
    }),
    ["description"]: Flags.string({
      default: "Generated from Bruno JSON report",
      description: "the description of the test execution issue",
      helpGroup: "TEST EXECUTION ISSUE",
    }),
    ["jira-token"]: Flags.string({
      dependsOn: ["url"],
      description: "the Jira API token",
      env: "JIRA_TOKEN",
      helpGroup: "AUTHENTICATION",
    }),
    ["jira-url"]: Flags.string({
      description: "the Jira URL",
      required: true,
    }),
    ["project-key"]: Flags.string({
      description: "the Jira project key where new test execution issues will be created",
      required: true,
    }),
    ["summary"]: Flags.string({
      default: "Bruno test execution",
      description: "the summary of the test execution issue",
      helpGroup: "TEST EXECUTION ISSUE",
    }),
    ["test-execution"]: Flags.string({
      description: "an existing Jira test execution issue to upload the test results to",
      helpGroup: "TEST EXECUTION ISSUE",
    }),
    ["xray-client-id"]: Flags.string({
      dependsOn: ["xray-client-secret"],
      description: "the Xray Cloud client ID",
      env: "XRAY_CLIENT_ID",
      helpGroup: "AUTHENTICATION",
    }),
    ["xray-client-secret"]: Flags.string({
      dependsOn: ["xray-client-id"],
      description: "the Xray Cloud client secret",
      env: "XRAY_CLIENT_SECRET",
      helpGroup: "AUTHENTICATION",
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { results },
      flags: {
        "csv-file": csvFile,
        description,
        "jira-token": jiraToken,
        "jira-url": jiraUrl,
        "project-key": projectKey,
        summary,
        "test-execution": testExecution,
        "xray-client-id": xrayClientId,
        "xray-client-secret": xrayClientSecret,
      },
    } = await this.parse(UploadResults);

    const brunoResults: BrunoIteration[] = JSON.parse(
      readFileSync(results, "utf-8")
    ) as BrunoIteration[];

    // Choose Xray server or cloud depending on the provided option combinations.
    const isCloudProject = xrayClientId !== undefined && xrayClientSecret !== undefined;
    const isServerProject = jiraToken !== undefined;

    if (!isCloudProject && !isServerProject) {
      throw new Error(
        `One of [--xray-client-id ... --xray-client-secret ...] or [--jira-token ... --jira-url ...] must be provided`
      );
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

    let response;

    if (isCloudProject) {
      response = await importExecution(
        `https://xray.cloud.getxray.app/api/v2/import/execution?projectKey=${projectKey}`,
        xrayResults,
        { clientId: xrayClientId, clientSecret: xrayClientSecret }
      );
    } else if (isServerProject) {
      response = await importExecution(
        `${jiraUrl}/rest/raven/1.0/import/execution?projectKey=${projectKey}`,
        xrayResults,
        { token: jiraToken }
      );
    }

    this.log(JSON.stringify(response, null, 2));
  }
}
