import { Args, Command, Flags } from "@oclif/core";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
import type { PluginTestPlan } from "../model/plugin-model.js";
import { envName } from "../util/env.js";
import { downloadDataset } from "./download-dataset.js";
import { uploadResults } from "./upload-results.js";

enum Positional {
  TEST_PLAN_FILE = "test-plan-file",
}

enum Flag {
  COLLECTION_DIRECTORY = "collection-directory",
}

export default class RunTests extends Command {
  static override args = {
    [Positional.TEST_PLAN_FILE]: Args.string({
      description: "the path to the Bruno test plan file to execute",
      required: true,
    }),
  };

  static override description =
    "Runs a Bruno test plan file and uploads the results to a test execution issue.";

  static override examples = ["<%= config.bin %> <%= command.id %>"];

  static override flags = {
    [Flag.COLLECTION_DIRECTORY]: Flags.string({
      default: ".",
      description: "the root collection directory",
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { [Positional.TEST_PLAN_FILE]: testPlanFile },
      flags: { [Flag.COLLECTION_DIRECTORY]: collectionDirectory },
    } = await this.parse(RunTests);
    const testPlan = JSON.parse(readFileSync(testPlanFile, "utf-8")) as PluginTestPlan;
    for (const test of testPlan.tests) {
      const response = await runDirectory(test, { ...testPlan.config, cwd: collectionDirectory });
      this.log(JSON.stringify(response, null, 2));
    }
  }
}

async function runDirectory(
  test: PluginTestPlan["tests"][number],
  options: PluginTestPlan["config"] & { cwd: string }
) {
  const resolvedOptions: PluginTestPlan["config"] = {
    certFile: options.certFile ? resolve(options.cwd, options.certFile) : undefined,
    environment: options.environment,
    projectKey: options.projectKey,
    testExecution: options.testExecution
      ? {
          description: options.testExecution.description,
          key: options.testExecution.key,
          summary: options.testExecution.summary,
        }
      : undefined,
    url: options.url,
  };
  const resolvedTest: PluginTestPlan["tests"][number] = {
    dataset: test.dataset
      ? {
          issueKey: test.dataset.issueKey,
          location: resolve(options.cwd, test.dataset.location),
        }
      : undefined,
    directory: resolve(options.cwd, test.directory),
  };
  if (resolvedTest.dataset) {
    if (!existsSync(resolvedTest.dataset.location)) {
      await downloadDataset({
        issueKey: resolvedTest.dataset.issueKey,
        jiraToken: process.env[envName("jira-token")],
        jiraUrl: resolvedOptions.url,
        output: resolvedTest.dataset.location,
        xrayClientId: process.env[envName("xray-client-id")],
        xrayClientSecret: process.env[envName("xray-client-secret")],
      });
    }
  }
  const resolvedResults = resolve(options.cwd, "results.json");
  // Run Bruno.
  const brunoArgs = ["bru", "run", "-r", `"${resolvedTest.directory}"`];
  brunoArgs.push("--env", `"${resolvedOptions.environment}"`);
  brunoArgs.push("--output", `"${resolvedResults}"`);
  if (resolvedOptions.certFile) {
    brunoArgs.push("--cacert", `"${resolvedOptions.certFile}"`);
  }
  if (resolvedTest.dataset?.location) {
    brunoArgs.push("--csv-file-path", `"${resolvedTest.dataset.location}"`);
  }
  try {
    await run("npx", { args: brunoArgs, cwd: options.cwd });
  } catch (error: unknown) {
    console.log("Encountered errors during Bruno execution", error);
    return;
  }
  return await uploadResults({
    csvFile: resolvedTest.dataset?.location,
    description: resolvedOptions.testExecution?.description,
    jiraToken: process.env[envName("jira-token")],
    jiraUrl: resolvedOptions.url,
    projectKey: resolvedOptions.projectKey,
    results: resolvedResults,
    summary: resolvedOptions.testExecution?.summary,
    testExecution: resolvedOptions.testExecution?.key,
    xrayClientId: process.env[envName("xray-client-id")],
    xrayClientSecret: process.env[envName("xray-client-secret")],
  });
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
