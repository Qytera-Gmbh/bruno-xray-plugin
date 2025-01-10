# Bruno

This directory contains a [Bruno](https://www.usebruno.com/) demo project.
The collections can be found in the `collections` directory.

The rest of the project consists of a CLI which allows users to upload Bruno's reports to [Xray](https://docs.getxray.app/site/xray).

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
  $ xray upload-results RESULTS --projectKey <value> [--clientId <value>] [--clientSecret <value>] [--csvFile <value>] [--description <value>] [--summary <value>] [--token <value>] [--url <value>]

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

<!-- commandsstop -->
