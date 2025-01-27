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
          summary: "Test execution using js file",
        },
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-108",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-108",
    },
  ],
};
