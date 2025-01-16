import type { XrayTestExecutionResults } from "../model/xray-model.js";

/**
 * Models the Xray response after a successful JSON result import.
 */
export interface ImportResponse {
  /**
   * The issue key of the test execution into which the results were imported.
   */
  key: string;
}

type XrayCredentials =
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

export class XrayClient {
  private readonly url: string;
  private readonly isCloudClient: boolean;
  private readonly credentials: XrayCredentials;

  constructor(
    config: { baseUrl: string; token: string } | { clientId: string; clientSecret: string }
  ) {
    if ("token" in config) {
      this.url = config.baseUrl;
      this.credentials = {
        token: config.token,
      };
      this.isCloudClient = false;
    } else {
      this.url = "https://xray.cloud.getxray.app";
      this.credentials = {
        clientId: config.clientId,
        clientSecret: config.clientSecret,
      };
      this.isCloudClient = true;
    }
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
   * Uploads test results to the Xray instance.
   *
   * @param url the Xray URL
   * @param results the test results
   * @param credentials the credentials to use
   * @returns the import response
   *
   * @see https://docs.getxray.app/display/XRAY/Import+Execution+Results+-+REST#ImportExecutionResultsREST-XrayJSONresults
   * @see https://docs.getxray.app/display/XRAYCLOUD/Exporting+datasets+-+REST+v2
   */
  public async downloadDataset(testIssueKey: string): Promise<string> {
    const authorizationValue = await this.getAuthorizationHeader(this.credentials);
    const url = this.isCloudClient
      ? `${this.url}/api/v2/dataset/export?testIssueKey=${testIssueKey}`
      : `${this.url}/rest/raven/2.0/dataset/export?testIssueKey=${testIssueKey}`;
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

  private async getAuthorizationHeader(credentials: XrayCredentials) {
    if ("token" in credentials) {
      return `Bearer ${credentials.token}`;
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
