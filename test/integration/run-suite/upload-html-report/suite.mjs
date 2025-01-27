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
          description: "this test execution issue contains an HTML report as evidence",
          summary: "HTML test execution evidence",
        },
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-65",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-65",
    },
  ],
};
