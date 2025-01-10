import type { XrayTestExecutionResults } from "../model/xray-model.js";

interface ImportResponse {
  key: string;
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
 * @see https://docs.getxray.app/display/XRAYCLOUD/Import+Execution+Results+-+REST+v2
 */
export async function importExecution(
  url: string,
  results: XrayTestExecutionResults,
  credentials:
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
      }
): Promise<ImportResponse> {
  let authorizationValue: string;
  if ("token" in credentials) {
    authorizationValue = `Bearer ${credentials.token}`;
  } else {
    const token = await fetch("https://xray.cloud.getxray.app/api/v2/authenticate", {
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
    authorizationValue = `Bearer ${(await token.json()) as string}`;
  }
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
