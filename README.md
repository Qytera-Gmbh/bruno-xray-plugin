<h1 align="center">
  <img width="100%" src="docs/logo.svg" alt="Bruno Xray Plugin">
</h1>

[![npm version](https://img.shields.io/npm/v/@qytera/bruno-xray-plugin?style=flat-square)](https://www.npmjs.com/package/@qytera/bruno-xray-plugin)
[![npm downloads](https://img.shields.io/npm/dm/@qytera/bruno-xray-plugin?style=flat-square)](https://www.npmjs.com/package/@qytera/bruno-xray-plugin)
[![open GitHub issues](https://img.shields.io/github/issues-raw/qytera-gmbh/bruno-xray-plugin?style=flat-square)](https://github.com/Qytera-Gmbh/bruno-xray-plugin/issues?q=is%3Aissue+is%3Aopen)
[![unaddressed GitHub issues](https://img.shields.io/github/issues-search/qytera-gmbh/bruno-xray-plugin?label=unaddressed%20issues&query=no%3Aassignee%20is%3Aopen&style=flat-square)](https://github.com/Qytera-Gmbh/bruno-xray-plugin/issues?q=is%3Aissue+is%3Aopen+no%3Aassignee)

# Bruno Xray Plugin

This project is a command line interface for a [Bruno](https://www.usebruno.com/) and [Xray](https://docs.getxray.app/site/xray) integration.

Features include:

- Upload Bruno test results to Xray
- Download Xray CSV test datasets for data-driven Bruno execution

Planned features:

- Customisable HTML report of test results for use as evidence

> [!WARNING]
> The plugin is still in a very early stage of development and may change a lot.

# Usage

To use the CLI, run the following commands which will install the packages necessary for interacting with the CLI.

```bash
npm install @qytera/bruno-xray-plugin
```

Afterwards, you can use the CLI as follows:

```bash
npx bruno-xray-plugin --version
npx bruno-xray-plugin --help
...
```

# Commands

## Main Commands

These are the main commands you should use to interact with Xray and Bruno.

### `run-suite`

Runs a plugin test suite file and uploads the results to a test execution issue.

```
USAGE
  $ bruno-xray-plugin run-suite FILE

ARGUMENTS
  FILE  the path to the Bruno test suite file to execute

FLAGS
  --collection-directory=<value>  [default: .] the root collection directory

REPORTING FLAGS
  --mask-value=<value>...  a sensitive value to mask in uploaded evidence
```

A typical plugin test suite file contains information about the Bruno configuration to be applied when running Bruno, the Jira configuration for test execution information, and the individual test directories to be run.

You can define suites in:

- `json` format (e.g. `my-suite.json`):

  ```json
  {
    "config": {
      "bruno": {
        "environment": "local"
      },
      "jira": {
        "projectKey": "BRU",
        "testExecution": {
          "details": {
            "summary": "A Bruno test suite execution",
            "description": "This test execution issue was created by the bruno-xray-plugin."
          }
        },
        "url": "https://example.atlassian.net"
      }
    },
    "tests": [
      {
        "directory": "my-directory",
        "dataset": {
          "location": "my-directory/data.csv",
          "issueKey": "BRU-1"
        },
        "key": "BRU-1"
      }
    ]
  }
  ```

- `js`/`mjs` format (e.g. `my-suite.js`):

  ```mjs
  export default {
    config: {
      // ...
    },
    tests: [
      // ...
    ],
  };
  ```

- `ts` format (e.g. `my-suite.ts`):

  ```ts
  import type { PluginTestSuite } from "@qytera/bruno-xray-plugin";

  const CONFIG: PluginTestSuite = {
    config: {
      // ...
    },
    tests: [
      // ...
    ],
  };

  export default CONFIG;
  ```

## Sub Commands

If a main command does not meet your needs, you can also use the individual commands it consists of to build your own solution.

### `xray download-dataset`

Downloads an Xray dataset from a Jira test issue and saves it to the local file system.

```
USAGE
  $ bruno-xray-plugin xray download-dataset ISSUE-KEY --jira-url <value>

ARGUMENTS
  ISSUE-KEY  the Jira test issue key whose dataset to download

FLAGS
  --jira-url=<value>  (required) the Jira URL
  --output=<value>    [default: data.csv] a file path to write the CSV data to

AUTHENTICATION FLAGS
  --jira-token=<value>          the Jira API token
  --xray-client-id=<value>      the Xray Cloud client ID
  --xray-client-secret=<value>  the Xray Cloud client secret
```

### `xray upload-results`

Converts Bruno JSON results to Xray JSON and uploads them to a Jira project.

```
USAGE
  $ bruno-xray-plugin xray upload-results RESULTS --jira-url <value> --project-key <value> --test-key <value>

ARGUMENTS
  RESULTS  the Bruno JSON results

FLAGS
  --jira-url=<value>     (required) the Jira URL
  --project-key=<value>  (required) the Jira project key where new test execution issues will be created
  --test-key=<value>     (required) the Jira test issue to attribute the test results to

REPORTING FLAGS
  --bruno-html-report=<value>  the Bruno HTML report file to upload as evidence
  --mask-value=<value>...      a sensitive value to mask in uploaded evidence

TEST EXECUTION ISSUE FLAGS
  --csv-file=<value>                            a CSV file which was used for data-driven Bruno execution and will be mapped to Xray's iterations
  --test-execution-description=<value>          [default: Generated from Bruno JSON report] the description for the test execution issue
  --test-execution-key=<value>                  an existing Jira test execution issue to upload the test results to
  --test-execution-revision=<value>             a revision for the revision custom field
  --test-execution-summary=<value>              [default: Bruno test execution] the summary of the test execution issue
  --test-execution-test-environment=<value>...  Xray test execution environments to assign the test execution issue to
  --test-execution-test-plan-key=<value>        the test plan key for associating the test execution issue
  --test-execution-user=<value>                 the username for the Jira user who executed the tests
  --test-execution-version=<value>              the version name for the fix version field of the test execution issue

AUTHENTICATION FLAGS
  --jira-token=<value>          the Jira API token
  --xray-client-id=<value>      the Xray Cloud client ID
  --xray-client-secret=<value>  the Xray Cloud client secret
```
