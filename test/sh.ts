import ansiColors from "ansi-colors";
import * as childProcess from "child_process";
import fs from "fs";
import path, { join } from "path";

const ENV_BACKUP = { ...process.env };

import "dotenv/config";

const ENV_CLOUD = [
  "XRAY_CLIENT_SECRET_CLOUD",
  "XRAY_CLIENT_ID_CLOUD",
  "JIRA_TOKEN_CLOUD",
  "JIRA_USERNAME_CLOUD",
  "JIRA_PASSWORD_CLOUD",
];

const ENV_SERVER = [
  "XRAY_CLIENT_SECRET_SERVER",
  "XRAY_CLIENT_ID_SERVER",
  "JIRA_TOKEN_SERVER",
  "JIRA_USERNAME_SERVER",
  "JIRA_PASSWORD_SERVER",
];

export function runPlugin(
  args: string[],
  options: {
    cwd: string;
    env?: Record<string, string | undefined>;
    expectedStatusCode?: number;
    includeDefaultEnv?: "cloud" | "server";
  }
): string[] {
  let mergedEnv = {
    ...ENV_BACKUP,
  };
  if (options.includeDefaultEnv === "cloud") {
    mergedEnv = {
      ...mergedEnv,
      ...getEnv(ENV_CLOUD),
    };
  }
  if (options.includeDefaultEnv === "server") {
    mergedEnv = {
      ...mergedEnv,
      ...getEnv(ENV_SERVER),
    };
  }
  mergedEnv = {
    ...mergedEnv,
    ...options.env,
  };
  fs.writeFileSync(
    path.join(options.cwd, ".env"),
    Object.entries(mergedEnv)
      .filter((entry): entry is [string, string] => entry[1] !== undefined)
      .map((entry) => `${entry[0]}=${entry[1]}`)
      .join("\n")
  );
  if (!fs.existsSync(join(options.cwd, "node_modules"))) {
    const result = childProcess.spawnSync("npm", ["install"], {
      cwd: options.cwd,
      shell: true,
    });
    if (result.status !== 0) {
      if (result.error) {
        throw new Error(
          [
            `npm installation finished with unexpected non-zero status code ${ansiColors.red(String(result.status))}:`,
            "",
            `  ${ansiColors.red(result.error.toString())}`,
            "",
            "stdout:",
            "",
            `  ${String(result.stdout)}`,
            "",
            "stderr:",
            "",
            `  ${String(result.stderr)}`,
            "",
          ].join("\n")
        );
      }
      throw new Error(
        [
          `npm installation finished with unexpected non-zero status code ${ansiColors.red(String(result.status))}`,
          "",
          "stdout:",
          "",
          `  ${String(result.stdout)}`,
          "",
          "stderr:",
          "",
          `  ${String(result.stderr)}`,
          "",
        ].join("\n")
      );
    }
  }
  const resolvedArgs = ["bruno-xray-plugin", ...args];
  const result = childProcess.spawnSync("npx", resolvedArgs, {
    cwd: options.cwd,
    env: mergedEnv,
    shell: true,
  });
  if (result.status !== (options.expectedStatusCode ?? 0)) {
    if (result.error) {
      throw new Error(
        [
          `Plugin command finished with unexpected non-zero status code ${ansiColors.red(String(result.status))}:`,
          "",
          `  ${ansiColors.gray(`npx ${resolvedArgs.join(" ")}`)}`,
          "",
          `  ${ansiColors.red(result.error.toString())}`,
          "",
          "stdout:",
          "",
          `  ${String(result.stdout)}`,
          "",
          "stderr:",
          "",
          `  ${String(result.stderr)}`,
          "",
        ].join("\n")
      );
    }
    throw new Error(
      [
        `Plugin command finished with unexpected non-zero status code ${ansiColors.red(String(result.status))}`,
        "",
        `  ${ansiColors.gray(`npx ${resolvedArgs.join(" ")}`)}`,
        "",
        "stdout:",
        "",
        `  ${String(result.stdout)}`,
        "",
        "stderr:",
        "",
        `  ${String(result.stderr)}`,
        "",
      ].join("\n")
    );
  }
  return result.output
    .filter((buffer): buffer is Buffer => buffer !== null)
    .map((buffer) => buffer.toString("utf8"));
}

function getEnv(names: string[]): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = {};
  for (const name of names) {
    const truncatedName = name.replace(/_CLOUD$/, "").replace(/_SERVER$/, "");
    const value = process.env[name];
    env[truncatedName] = value;
  }
  return env;
}

export interface IntegrationTest {
  env?: Record<string, string | undefined>;
  service: "cloud" | "server";
  testIssueKey: string;
  title: string;
}
