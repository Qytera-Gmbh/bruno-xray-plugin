import { Args, Command, Flags } from "@oclif/core";
import ansiColors from "ansi-colors";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import { pathToFileURL } from "node:url";
import type { PluginTestSuite } from "../model/plugin-model.js";
import { envName } from "../util/env.js";
import { downloadDataset } from "./xray/download-dataset.js";
import { uploadResults } from "./xray/upload-results.js";

import "dotenv/config";

enum Positional {
  TEST_SUITE_FILE = "file",
}

enum Flag {
  COLLECTION_DIRECTORY = "collection-directory",
}

export default class RunSuite extends Command {
  static override args = {
    [Positional.TEST_SUITE_FILE]: Args.string({
      description: "the path to the Bruno test suite file to execute",
      required: true,
    }),
  };

  static override description =
    "Runs a plugin test suite file and uploads the results to a test execution issue.";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    [Flag.COLLECTION_DIRECTORY]: Flags.string({
      default: ".",
      description: "the root collection directory",
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { [Positional.TEST_SUITE_FILE]: testPlanFile },
      flags: { [Flag.COLLECTION_DIRECTORY]: collectionDirectory },
    } = await this.parse(RunSuite);

    let testPlan: PluginTestSuite;

    const resolvedPath = resolve(cwd(), testPlanFile);

    if (resolvedPath.endsWith(".mjs") || resolvedPath.endsWith(".js")) {
      testPlan = (
        (await import(pathToFileURL(resolvedPath).toString())) as { default: PluginTestSuite }
      ).default;
    } else if (testPlanFile.endsWith(".json")) {
      testPlan = JSON.parse(readFileSync(resolvedPath, "utf-8")) as PluginTestSuite;
    } else {
      throw new Error(`Unsupported test suite file extension: ${resolvedPath}`);
    }

    for (const test of testPlan.tests) {
      const response = await runDirectory(test, { ...testPlan.config, cwd: collectionDirectory });
      if (response) {
        let key: string;
        if ("key" in response) {
          key = response.key;
        } else {
          key = response.testExecIssue.key;
        }
        this.log(
          ansiColors.green(`Uploaded results to: ${testPlan.config.jira.url}/browse/${key}`)
        );
        this.log(JSON.stringify(response, null, 2));
      }
    }
  }
}

async function runDirectory(
  test: PluginTestSuite["tests"][number],
  options: PluginTestSuite["config"] & { cwd: string }
) {
  const resolvedOptions: PluginTestSuite["config"] = {
    bruno: {
      certFile: options.bruno.certFile ? resolve(options.cwd, options.bruno.certFile) : undefined,
      environment: options.bruno.environment,
    },
    jira: options.jira,
  };
  const resolvedTest: PluginTestSuite["tests"][number] = {
    dataset: test.dataset
      ? {
          issueKey: test.dataset.issueKey,
          location: resolve(options.cwd, test.dataset.location),
        }
      : undefined,
    directory: resolve(options.cwd, test.directory),
  };
  const resolvedResults = resolve(options.cwd, "results.json");
  if (resolvedTest.dataset) {
    if (!existsSync(resolvedTest.dataset.location)) {
      await downloadDataset({
        issueKey: resolvedTest.dataset.issueKey,
        jiraToken: process.env[envName("jira-token")],
        jiraUrl: resolvedOptions.jira.url,
        output: resolvedTest.dataset.location,
        xrayClientId: process.env[envName("xray-client-id")],
        xrayClientSecret: process.env[envName("xray-client-secret")],
      });
    }
  }
  try {
    await runBruno(resolvedOptions, resolvedTest, resolvedResults, options.cwd);
  } catch (error: unknown) {
    console.log("Encountered errors during Bruno execution", error);
    return;
  }
  console.log(ansiColors.gray("Uploading results to Xray..."));
  return await uploadResults({
    csvFile: resolvedTest.dataset?.location,
    jiraToken: process.env[envName("jira-token")],
    jiraUrl: resolvedOptions.jira.url,
    projectKey: resolvedOptions.jira.projectKey,
    results: resolvedResults,
    testExecution: resolvedOptions.jira.testExecution,
    xrayClientId: process.env[envName("xray-client-id")],
    xrayClientSecret: process.env[envName("xray-client-secret")],
  });
}

async function runBruno(
  config: PluginTestSuite["config"],
  test: PluginTestSuite["tests"][number],
  resultsFile: string,
  workingDirectory: string
) {
  const brunoArgs = ["bru", "run", "-r", `"${test.directory}"`];
  brunoArgs.push("--env", `"${config.bruno.environment}"`);
  brunoArgs.push("--output", `"${resultsFile}"`);
  if (config.bruno.certFile) {
    brunoArgs.push("--cacert", `"${config.bruno.certFile}"`);
  }
  if (test.dataset?.location) {
    brunoArgs.push("--csv-file-path", `"${test.dataset.location}"`);
  }
  await run("npx", { args: brunoArgs, cwd: workingDirectory });
}

function run(command: string, config: { args: readonly string[]; cwd?: string }) {
  return new Promise((res, rej) => {
    const child = spawn(command, config.args, {
      cwd: config.cwd ?? cwd(),
      env: process.env,
      shell: true,
      stdio: "inherit",
    });
    child.once("error", (error) => {
      rej(error);
    });
    child.once("close", (code) => {
      res(code);
    });
  });
}
