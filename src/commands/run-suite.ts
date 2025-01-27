import { Args, Command, Flags } from "@oclif/core";
import ansiColors from "ansi-colors";
import type { Loader } from "cosmiconfig";
import { defaultLoaders } from "cosmiconfig";
import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cwd } from "node:process";
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
  MASK_VALUE = "mask-value",
}

enum HelpGroup {
  REPORTING = "REPORTING",
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
    [Flag.MASK_VALUE]: Flags.string({
      description: "a sensitive value to mask in uploaded evidence",
      helpGroup: HelpGroup.REPORTING,
      multiple: true,
      multipleNonGreedy: true,
    }),
  };

  public async run(): Promise<void> {
    const {
      args: { [Positional.TEST_SUITE_FILE]: testPlanFile },
      flags: { [Flag.COLLECTION_DIRECTORY]: collectionDirectory, [Flag.MASK_VALUE]: maskedValues },
    } = await this.parse(RunSuite);

    const resolvedPath = resolve(cwd(), testPlanFile);

    let loader: Loader;

    if (resolvedPath.endsWith(".mjs") || resolvedPath.endsWith(".js")) {
      loader = defaultLoaders[".mjs"];
    } else if (resolvedPath.endsWith(".ts")) {
      loader = defaultLoaders[".ts"];
    } else if (resolvedPath.endsWith(".json")) {
      loader = defaultLoaders[".json"];
    } else {
      throw new Error(`Unsupported test suite file extension: ${resolvedPath}`);
    }

    const testPlan = (await loader(
      resolvedPath,
      readFileSync(resolvedPath, "utf-8")
    )) as PluginTestSuite;

    for (const test of testPlan.tests) {
      const response = await runDirectory(test, {
        ...testPlan.config,
        cwd: collectionDirectory,
        maskedValues,
      });
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
  options: PluginTestSuite["config"] & { cwd: string; maskedValues?: string[] }
) {
  const resolvedOptions: PluginTestSuite["config"] = {
    bruno: {
      certFile: options.bruno.certFile ? resolve(options.cwd, options.bruno.certFile) : undefined,
      environment: options.bruno.environment,
      report: options.bruno.report,
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
    key: test.key,
  };
  const resolvedResults = resolve(resolvedTest.directory, "results.json");
  const resolvedHtmlResult = resolvedOptions.bruno.report?.html
    ? resolve(resolvedTest.directory, "results.html")
    : undefined;
  if (resolvedTest.dataset) {
    if (!existsSync(resolvedTest.dataset.location)) {
      if (!resolvedTest.dataset.issueKey) {
        throw new Error(`Failed to find test dataset ${resolvedTest.dataset.location}`);
      }
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
    await runBruno(
      resolvedOptions,
      resolvedTest,
      { html: resolvedHtmlResult, json: resolvedResults },
      options.cwd
    );
  } catch (error: unknown) {
    console.log("Encountered errors during Bruno execution", error);
    return;
  }
  console.log(ansiColors.gray("Uploading results to Xray..."));
  return await uploadResults({
    csvFile: resolvedTest.dataset?.location,
    jiraToken: process.env[envName("jira-token")],
    jiraUrl: resolvedOptions.jira.url,
    maskedValues: options.maskedValues,
    projectKey: resolvedOptions.jira.projectKey,
    results: {
      htmlFile: resolvedHtmlResult,
      jsonFile: resolvedResults,
    },
    testExecution: resolvedOptions.jira.testExecution,
    testKey: resolvedTest.key,
    xrayClientId: process.env[envName("xray-client-id")],
    xrayClientSecret: process.env[envName("xray-client-secret")],
  });
}

async function runBruno(
  config: PluginTestSuite["config"],
  test: PluginTestSuite["tests"][number],
  results: {
    html?: string;
    json: string;
  },
  workingDirectory: string
) {
  const brunoArgs = ["bru", "run", "-r", `"${test.directory}"`];
  brunoArgs.push("--env", `"${config.bruno.environment}"`);
  brunoArgs.push("--output", `"${results.json}"`);
  if (config.bruno.certFile) {
    brunoArgs.push("--cacert", `"${config.bruno.certFile}"`);
  }
  if (test.dataset?.location) {
    brunoArgs.push("--csv-file-path", `"${test.dataset.location}"`);
  }
  if (results.html) {
    brunoArgs.push("--reporter-html", `"${results.html}"`);
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
