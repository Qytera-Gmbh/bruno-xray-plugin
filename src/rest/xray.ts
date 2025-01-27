import type { GetTestRunsResponseCloud } from "../model/xray/graphql/get-test-runs.js";
import type { TestRun } from "../model/xray/graphql/xray.js";
import type { ImportResponse, XrayTestExecutionResults } from "../model/xray/import-execution.js";

type XrayCredentials =
  | {
      /**
       * The Jira server basic auth password.
       */
      password: string;
      /**
       * The Jira server basic auth username.
       */
      username: string;
    }
  | {
      /**
       * The Jira server PAT.
       */
      token: string;
    }
  | {
      /**
       * The Xray cloud client ID.
       */
      clientId: string;
      /**
       * The Xray cloud client secret.
       */
      clientSecret: string;
    };

/**
 * A singleton client instance.
 */
let client: null | XrayClient = null;

export class XrayClient {
  public static readonly CLOUD_URL = "https://xray.cloud.getxray.app";
  private static readonly CLOUD_URL_GRAPHQL = `${XrayClient.CLOUD_URL}/api/v2/graphql`;
  private static readonly CLOUD_GRAPHQL_LIMIT = 100;

  private readonly url: string;
  private readonly isCloudClient: boolean;
  private readonly credentials: XrayCredentials;

  constructor(
    config:
      | { baseUrl: string; password: string; username: string }
      | { baseUrl: string; token: string }
      | { clientId: string; clientSecret: string }
  ) {
    if ("token" in config) {
      this.url = config.baseUrl;
      this.credentials = {
        token: config.token,
      };
      this.isCloudClient = false;
    } else if ("username" in config) {
      this.url = config.baseUrl;
      this.credentials = {
        password: config.password,
        username: config.username,
      };
      this.isCloudClient = false;
    } else {
      this.url = XrayClient.CLOUD_URL;
      this.credentials = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
      this.isCloudClient = true;
    }
  }

  /**
   * Obtains an instance of an Xray client.
   *
   * @param args Xray client constructor arguments
   * @returns the Xray client
   */
  public static instance(...args: ConstructorParameters<typeof XrayClient>) {
    if (!client) {
      client = new XrayClient(...args);
    }
    return client;
  }

  /**
   * Uploads test results to the Xray instance.
   *
   * @param results the test results
   * @param projectKey the key of the project to use for new test executions
   * @returns the import response
   *
   * @see https://docs.getxray.app/display/XRAY/Import+Execution+Results+-+REST#ImportExecutionResultsREST-XrayJSONresults
   * @see https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results+-+REST+v2
   */
  public async importExecution(
    results: XrayTestExecutionResults,
    projectKey: string
  ): Promise<ImportResponse> {
    const authorizationValue = await this.getAuthorizationHeader(this.credentials);
    const url = this.isCloudClient
      ? `${this.url}/api/v2/import/execution?projectKey=${projectKey}`
      : `${this.url}/rest/raven/1.0/import/execution?projectKey=${projectKey}`;
    const response = await fetch(url, {
      body: JSON.stringify(results),
      headers: {
        ["Accept"]: "application/json",
        ["Authorization"]: authorizationValue,
        ["Content-Type"]: "application/json",
      },
      method: "POST",
    });
    if (response.status === 200) {
      return (await response.json()) as ImportResponse;
    }
    throw new Error(
      `Unexpected response status ${response.status.toString()}: ${await response.text()}`
    );
  }

  /**
   * Downloads a dataset from a test issue.
   *
   * @param testIssueKey the test issue key
   * @returns the dataset's CSV content
   *
   * @see https://docs.getxray.app/display/XRAY/v2.0#/Dataset/get_dataset_export
   * @see https://docs.getxray.app/display/XRAYCLOUD/Exporting+datasets+-+REST+v2
   */
  public async downloadDataset(testIssueKey: string): Promise<string> {
    const authorizationValue = await this.getAuthorizationHeader(this.credentials);
    const url = this.isCloudClient
      ? `${this.url}/api/v2/dataset/export?testIssueKey=${testIssueKey}`
      : `${this.url}/rest/raven/2.0/api/dataset/export?testIssueKey=${testIssueKey}`;
    const response = await fetch(url, {
      headers: {
        ["Authorization"]: authorizationValue,
      },
      method: "GET",
    });
    if (response.status === 200) {
      return await response.text();
    }
    throw new Error(
      `Unexpected response status ${response.status.toString()}: ${await response.text()}`
    );
  }

  /**
   * Returns a test execution by issue ID.
   *
   * @param options - the GraphQL options
   * @returns the test run results
   * @see https://us.xray.cloud.getxray.app/doc/graphql/gettestruns.doc.html
   */
  public async getTestRunResults(options: {
    /**
     * The issue ids of the test execution of the test runs.
     */
    testExecIssueIds: [string, ...string[]];
    /**
     * The issue ids of the test of the test runs.
     */
    testIssueIds: [string, ...string[]];
  }): Promise<TestRun<{ key: string }>[]> {
    const authorizationValue = await this.getAuthorizationHeader(this.credentials);
    const runResults: TestRun<{ key: string }>[] = [];
    let total = 0;
    let start = 0;
    const query = `
      query($testIssueIds: [String], $testExecIssueIds: [String], $start: Int!, $limit: Int!) {
        getTestRuns( testIssueIds: $testIssueIds, testExecIssueIds: $testExecIssueIds, limit: $limit, start: $start) {
          total
          limit
          start
          results {
            status {
              name
            }
            test {
              jira(fields: ["key"])
            }
            evidence {
              id
              filename
              downloadLink
            }
            iterations(limit: $limit) {
              results {
                parameters {
                  name
                  value
                }
                status {
                  name
                }
              }
            }
          }
        }
      }
    `;
    do {
      const paginatedRequest = {
        query: query,
        variables: {
          limit: XrayClient.CLOUD_GRAPHQL_LIMIT,
          start: start,
          testExecIssueIds: options.testExecIssueIds,
          testIssueIds: options.testIssueIds,
        },
      };
      const response = await fetch(XrayClient.CLOUD_URL_GRAPHQL, {
        body: JSON.stringify(paginatedRequest),
        headers: {
          ["Accept"]: "application/json",
          ["Authorization"]: authorizationValue,
          ["Content-Type"]: "application/json",
        },
        method: "POST",
      });
      const body = (await response.json()) as GetTestRunsResponseCloud<{ key: string }>;
      const testRuns = body.data.getTestRuns;
      total = testRuns?.total ?? total;
      if (testRuns?.results) {
        if (typeof testRuns.start === "number") {
          start = testRuns.start + testRuns.results.length;
        }
        for (const test of testRuns.results) {
          runResults.push(test);
        }
      }
    } while (start && start < total);
    return runResults;
  }

  /**
   * Downloads an attachment.
   *
   * @param attachmentId - the ID of the attachment to download
   * @returns the attachment content
   * @see https://docs.getxray.app/display/XRAYCLOUD/Attachments+-+REST+v2
   */
  public async downloadAttachment(attachmentId: string): Promise<string> {
    const authorizationValue = await this.getAuthorizationHeader(this.credentials);

    const response = await fetch(`${XrayClient.CLOUD_URL}/api/v2/attachments/${attachmentId}`, {
      headers: {
        ["Authorization"]: authorizationValue,
      },
      method: "GET",
    });
    return await response.text();
  }

  private async getAuthorizationHeader(credentials: XrayCredentials) {
    if ("token" in credentials) {
      return `Bearer ${credentials.token}`;
    } else if ("username" in credentials) {
      return Buffer.from(`${credentials.username}:${credentials.password}`).toString("base64");
    } else {
      const token = await fetch(`${this.url}/api/v2/authenticate`, {
        body: JSON.stringify({
          ["client_id"]: credentials.clientId,
          ["client_secret"]: credentials.clientSecret,
        }),
        headers: {
          ["Accept"]: "application/json",
          ["Content-Type"]: "application/json",
        },
        method: "POST",
      });
      return `Bearer ${(await token.json()) as string}`;
    }
  }
}
