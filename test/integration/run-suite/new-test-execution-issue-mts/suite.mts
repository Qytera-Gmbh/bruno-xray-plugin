import type { PluginTestSuite } from "@qytera/bruno-xray-plugin";

const CONFIG: PluginTestSuite = {
  config: {
    bruno: {
      environment: "local",
    },
    jira: {
      projectKey: "BRU",
      testExecution: {
        details: {
          summary: "Test execution using mts file",
        },
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-107",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-107",
    },
  ],
};

export default CONFIG;
