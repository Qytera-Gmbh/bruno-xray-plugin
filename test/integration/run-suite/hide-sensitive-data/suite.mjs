// @ts-check
/**
 * @type {import("@qytera/bruno-xray-plugin").PluginTestSuite}
 */
export default {
  config: {
    bruno: {
      environment: "local",
      report: {
        html: true,
      },
    },
    jira: {
      projectKey: "BRU",
      testExecution: {
        details: {
          description: "this test execution issue hides sensitive data",
          summary: "sensitive test execution evidence",
        },
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-84",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-84",
    },
  ],
};
