import { Args, Command, Flags } from "@oclif/core";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { XrayClient } from "../rest/xray.js";

enum Positionals {
  ISSUE_KEY = "issue-key",
}

enum Flag {
  JIRA_TOKEN = "jira-token",
  JIRA_URL = "jira-url",
  OUTPUT = "output",
  XRAY_CLIENT_ID = "xray-client-id",
  XRAY_CLIENT_SECRET = "xray-client-secret",
}

enum HelpGroup {
  AUTHENTICATION = "AUTHENTICATION",
  TEST_EXECUTION_ISSUE = "TEST EXECUTION ISSUE",
}

export default class DownloadDataset extends Command {
  static override args = {
    [Positionals.ISSUE_KEY]: Args.string({
      description: "the Jira test issue key whose dataset to download",
      required: true,
    }),
  };

  static override description =
    "Downloads an Xray dataset from a Jira test issue and saves it to the local file system.";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    [Flag.JIRA_TOKEN]: Flags.string({
      description: "the Jira API token",
      env: "JIRA_TOKEN",
      helpGroup: HelpGroup.AUTHENTICATION,
    }),
    [Flag.JIRA_URL]: Flags.string({
      description: "the Jira URL",
      required: true,
    }),
    [Flag.OUTPUT]: Flags.string({
      default: "data.csv",
      description: "a file path to write the CSV data to",
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
      args: { [Positionals.ISSUE_KEY]: issueKey },
      flags: {
        [Flag.JIRA_TOKEN]: jiraToken,
        [Flag.JIRA_URL]: jiraUrl,
        [Flag.OUTPUT]: output,
        [Flag.XRAY_CLIENT_ID]: xrayClientId,
        [Flag.XRAY_CLIENT_SECRET]: xrayClientSecret,
      },
    } = await this.parse(DownloadDataset);

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

    const response = await xrayClient.downloadDataset(issueKey);

    writeFileSync(output, response);

    this.log(`dataset for ${issueKey} written to ${resolve(cwd(), output)}`);
  }
}
