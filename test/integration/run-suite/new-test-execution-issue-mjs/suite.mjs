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
