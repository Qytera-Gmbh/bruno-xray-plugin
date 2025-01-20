import type { XrayTestExecutionInfo } from "./xray/import-execution.js";

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
     * The relevant Bruno settings.
     */
    bruno: {
      /**
       * The path to a CA certificate that Bruno will use during its execution.
       */
      certFile?: string;
      /**
       * The Bruno environment to use.
       */
      environment: string;
    };
    /**
     * The relevant Jira settings.
     */
    jira: {
      /**
       * The Jira project key where new test execution issues will be created.
       */
      projectKey: string;
      /**
       * The test execution information.
       */
      testExecution?: {
        /**
         * If `key` is not specified, these details will be applied to a new test execution issue.
         * Otherwise, the existing issue will be updated with the information specified here.
         */
        details?: XrayTestExecutionInfo;
        /**
         * An existing Jira test execution issue to upload the test results to.
         */
        key?: string;
      };
      url: string;
    };
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
