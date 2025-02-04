import { Args, Command, Flags } from "@oclif/core";
import { XrayClientCloud, XrayClientServer } from "@qytera/xray-client";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { cwd } from "node:process";
import { envName } from "../../util/env.js";

import "dotenv/config";

enum Positional {
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
    [Positional.ISSUE_KEY]: Args.string({
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
      env: envName("jira-token"),
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
      args: { [Positional.ISSUE_KEY]: issueKey },
      flags: {
        [Flag.JIRA_TOKEN]: jiraToken,
        [Flag.JIRA_URL]: jiraUrl,
        [Flag.OUTPUT]: output,
        [Flag.XRAY_CLIENT_ID]: xrayClientId,
        [Flag.XRAY_CLIENT_SECRET]: xrayClientSecret,
      },
    } = await this.parse(DownloadDataset);
    await downloadDataset({ issueKey, jiraToken, jiraUrl, output, xrayClientId, xrayClientSecret });
    this.log(`dataset for ${issueKey} written to ${resolve(cwd(), output)}`);
  }
}

export async function downloadDataset(options: {
  issueKey: string;
  jiraToken?: string;
  jiraUrl: string;
  output: string;
  xrayClientId?: string;
  xrayClientSecret?: string;
}) {
  // Choose Xray server or cloud client depending on the provided authentication combinations.
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
  const response = await xrayClient.dataset.export({ testIssueKey: options.issueKey });
  const destination = resolve(options.output);
  mkdirSync(dirname(destination), { recursive: true });
  writeFileSync(destination, response);
}
