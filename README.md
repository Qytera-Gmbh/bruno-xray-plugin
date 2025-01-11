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

Planned features:

- Download of Xray CSV datasets for data-driven Bruno execution
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

## `upload-results`

Converts Bruno JSON results to Xray JSON and uploads them to a Jira project.

```
USAGE
  $ bruno-xray-plugin upload-results RESULTS --projectKey <value> [--clientId <value>] [--clientSecret <value>] [--csvFile <value>] [--description <value>] [--summary <value>] [--token <value>] [--url <value>]

ARGUMENTS
  RESULTS  the Bruno JSON results

FLAGS
  --clientId=<value>      the Xray Cloud client ID
  --clientSecret=<value>  the Xray Cloud client secret
  --csvFile=<value>       the CSV file which was used for data-driven collection execution
  --description=<value>   [default: Generated from Bruno JSON report] the description of the test execution issue
  --projectKey=<value>    (required) the Jira project key where the test execution issue will be created
  --summary=<value>       [default: Bruno test execution] the summary of the test execution issue
  --token=<value>         the Jira API token
  --url=<value>           the Jira Server/DC URL
```
