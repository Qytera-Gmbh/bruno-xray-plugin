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
          description: "this test execution issue was reused in an mjs config",
          summary: "reused test execution issue mjs",
        },
        key: "BRU-9",
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-24",
        location: "first-test/data.csv",
      },
      directory: "first-test",
      key: "BRU-24",
    },
  ],
};
