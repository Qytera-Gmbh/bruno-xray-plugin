/**
 * Returns the name of the desired environment variable.
 *
 * @param kind the environment variable kind whose name to return
 * @returns the name
 */
export function envName(kind: "jira-token" | "xray-client-id" | "xray-client-secret") {
  switch (kind) {
    case "jira-token":
      return "JIRA_TOKEN";
    case "xray-client-id":
      return "XRAY_CLIENT_ID";
    case "xray-client-secret":
      return "XRAY_CLIENT_SECRET";
  }
}
