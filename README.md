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

## `download-dataset`

Downloads an Xray dataset from a Jira test issue and saves it to the local file system.

```
USAGE
  $ bruno-xray-plugin download-dataset ISSUE-KEY --jira-url <value> [--jira-token <value>] [--output <value>] [--xray-client-id <value> --xray-client-secret <value>]

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

## `upload-results`

Converts Bruno JSON results to Xray JSON and uploads them to a Jira project.

```
USAGE
  $ bruno-xray-plugin upload-results RESULTS --jira-url <value> --project-key <value> [--csv-file <value>] [--description <value>] [--jira-token <value>] [--summary <value>] [--test-execution <value>] [--xray-client-id <value> --xray-client-secret <value>]

ARGUMENTS
  RESULTS  the Bruno JSON results

FLAGS
  --jira-url=<value>     (required) the Jira URL
  --project-key=<value>  (required) the Jira project key where new test execution issues will be created

TEST EXECUTION ISSUE FLAGS
  --csv-file=<value>        a CSV file which was used for data-driven Bruno execution and will be mapped to Xray's iterations
  --description=<value>     [default: Generated from Bruno JSON report] the description of the test execution issue
  --summary=<value>         [default: Bruno test execution] the summary of the test execution issue
  --test-execution=<value>  an existing Jira test execution issue to upload the test results to

AUTHENTICATION FLAGS
  --jira-token=<value>          the Jira API token
  --xray-client-id=<value>      the Xray Cloud client ID
  --xray-client-secret=<value>  the Xray Cloud client secret
```
