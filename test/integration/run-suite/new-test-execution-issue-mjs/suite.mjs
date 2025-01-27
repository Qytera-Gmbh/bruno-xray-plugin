// @ts-check
/**
 * @type {import("@qytera/bruno-xray-plugin").PluginTestSuite}
 */
export default {
  config: {
    bruno: {
      environment: "local",
    },
    jira: {
      projectKey: "BRU",
      testExecution: {
        details: {
          summary: "Test execution using mjs file",
        },
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-10",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-10",
    },
  ],
};
