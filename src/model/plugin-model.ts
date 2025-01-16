/**
 * Models a test suite of the Bruno Xray plugin. It contains a general configuration and an array of
 * tests to execute.
 */
export interface PluginTestSuite {
  /**
   * The general test execution configuration.
   */
  config: {
    /**
     * The path to a CA certificate that Bruno will use during its execution.
     */
    certFile?: string;
    /**
     * The Bruno environment to use.
     */
    environment: string;
    /**
     * The Jira project key where new test execution issues will be created.
     */
    projectKey: string;
    /**
     * The test execution information.
     */
    testExecution?: {
      /**
       * The description of the test execution issue.
       */
      description?: string;
      /**
       * An existing Jira test execution issue to upload the test results to.
       */
      key?: string;
      /**
       * The summary of the test execution issue.
       */
      summary?: string;
    };
    url: string;
  };
  /**
   * The tests to execute in this suite.
   */
  tests: {
    /**
     * An optional dataset to use for data-driven test execution.
     */
    dataset?: {
      /**
       * The test issue key to download the data set from.
       */
      issueKey: string;
      /**
       * The location to save the dataset file to if not already present.
       */
      location: string;
    };
    /**
     * The directory representing the test case.
     */
    directory: string;
  }[];
}
