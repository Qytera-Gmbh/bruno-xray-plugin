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
    ["client-id"]: Flags.string({
      description: "the Xray Cloud client ID",
      helpGroup: "authentication",
    }),
    ["client-secret"]: Flags.string({
      description: "the Xray Cloud client secret",
      helpGroup: "authentication",
    }),
    ["csv-file"]: Flags.string({
      description: "the CSV file which was used for data-driven collection execution",
    }),
    ["description"]: Flags.string({
      default: "Generated from Bruno JSON report",
      description: "the description of the test execution issue",
    }),
    ["project-key"]: Flags.string({
      description: "the Jira project key where the test execution issue will be created",
      required: true,
    }),
    ["summary"]: Flags.string({
      default: "Bruno test execution",
      description: "the summary of the test execution issue",
    }),
    ["token"]: Flags.string({ description: "the Jira API token", helpGroup: "authentication" }),
    ["url"]: Flags.string({ description: "the Jira Server/DC URL" }),
  };

  public async run(): Promise<void> {
    const {
      args: { results },
      flags: {
        "client-id": clientId,
        "client-secret": clientSecret,
        "csv-file": csvFile,
        description,
        "project-key": projectKey,
        summary,
        token,
        url,
      },
    } = await this.parse(UploadResults);

    const brunoResults: BrunoIteration[] = JSON.parse(
      readFileSync(results, "utf-8")
    ) as BrunoIteration[];

    // Choose Xray server or cloud depending on the provided option combinations.
    const isCloudProject = clientId !== undefined && clientSecret !== undefined;
    const isServerProject = token !== undefined && url !== undefined;

    if (!isCloudProject && !isServerProject) {
      throw new Error(
        `One of [--client-id ... --client-secret ...] or [--token ... --url ...] must be provided`
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
        { clientId, clientSecret }
      );
    } else if (isServerProject) {
      response = await importExecution(
        `${url}/rest/raven/1.0/import/execution?projectKey=${projectKey}`,
        xrayResults,
        { token }
      );
    }

    this.log(JSON.stringify(response, null, 2));
  }
}
