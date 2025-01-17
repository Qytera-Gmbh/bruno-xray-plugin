import type { Client } from "jira.js";
import { Version2Client, Version3Client } from "jira.js";
import assert from "node:assert";
import { XrayClient } from "../../src/rest/xray.js";

import "dotenv/config";

export function getActualTestExecutionIssueKey(projectKey: string, output: string[]): string {
  const regex = new RegExp(`Uploaded results to: .+/browse/(${projectKey}-\\d+)`);
  const createdIssueLine = output.find((line) => regex.test(line))?.match(regex);
  assert.ok(createdIssueLine);
  const testExecutionIssueKey = createdIssueLine[1];
  return testExecutionIssueKey;
}

const XRAY_CLIENT_CLOUD = new XrayClient({
  clientId: getEnvValue("XRAY_CLIENT_ID_CLOUD", "XRAY_CLIENT_ID"),
  clientSecret: getEnvValue("XRAY_CLIENT_SECRET_CLOUD", "XRAY_CLIENT_SECRET"),
});

const XRAY_CLIENT_SERVER = new XrayClient({
  baseUrl: "https://xray-demo3.getxray.app",
  password: getEnvValue("JIRA_PASSWORD_SERVER"),
  username: getEnvValue("JIRA_USERNAME_SERVER"),
});

const JIRA_CLIENT_CLOUD = new Version3Client({
  authentication: {
    basic: {
      apiToken: getEnvValue("JIRA_TOKEN_CLOUD"),
      email: getEnvValue("JIRA_USERNAME_CLOUD"),
    },
  },
  host: "https://qualitymaster.atlassian.net",
});

const JIRA_CLIENT_SERVER = new Version2Client({
  authentication: {
    basic: {
      password: getEnvValue("JIRA_PASSWORD_SERVER"),
      username: getEnvValue("JIRA_USERNAME_SERVER"),
    },
  },
  host: "https://xray-demo3.getxray.app",
});

export function getIntegrationClient(client: "xray", service: "cloud" | "server"): XrayClient;
export function getIntegrationClient(client: "jira", service: "cloud"): Version3Client;
export function getIntegrationClient(client: "jira", service: "server"): Version2Client;
export function getIntegrationClient(
  client: "jira" | "xray",
  service: "cloud" | "server"
): Client | XrayClient {
  switch (client) {
    case "jira": {
      switch (service) {
        case "cloud":
          return JIRA_CLIENT_CLOUD;
        case "server":
          return JIRA_CLIENT_SERVER;
        default:
          throw new Error("Unknown service type");
      }
    }
    case "xray": {
      switch (service) {
        case "cloud":
          return XRAY_CLIENT_CLOUD;
        case "server":
          return XRAY_CLIENT_SERVER;
        default:
          throw new Error("Unknown service type");
      }
    }
    default:
      throw new Error("Unknown client type");
  }
}

function getEnvValue(...keys: string[]): string {
  let value: string | undefined;
  for (const key of keys) {
    if (!process.env[key]) {
      continue;
    }
    value = process.env[key];
  }
  if (!value) {
    throw new Error(`Failed to find environment variable value for keys: ${JSON.stringify(keys)}`);
  }
  return value;
}
