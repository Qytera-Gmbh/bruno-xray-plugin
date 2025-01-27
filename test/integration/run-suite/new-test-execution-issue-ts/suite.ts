import type { PluginTestSuite } from "@qytera/bruno-xray-plugin";

const CONFIG: PluginTestSuite = {
  config: {
    bruno: {
      environment: "local",
    },
    jira: {
      projectKey: "BRU",
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-106",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-106",
    },
  ],
};

export default CONFIG;
