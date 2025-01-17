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
        description: "this test execution issue was reused in an mjs config",
        key: "BRU-9",
        summary: "reused test execution issue mjs",
      },
      url: "https://qualitymaster.atlassian.net",
    },
  },
  tests: [
    {
      dataset: {
        issueKey: "BRU-24",
        location: "BRU-24/data.csv",
      },
      directory: "BRU-24",
    },
  ],
};
