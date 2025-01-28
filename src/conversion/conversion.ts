import { readFileSync } from "node:fs";
import { basename } from "node:path";
import type {
  BrunoIteration,
  BrunoRequest,
  BrunoRequestResult,
  BrunoResponse,
} from "../model/bruno-model.js";
import type { PluginTestSuite } from "../model/plugin-model.js";
import type {
  XrayEvidenceItem,
  XrayIterationResult,
  XrayTest,
  XrayTestExecutionResults,
} from "../model/xray/import-execution.js";
import { maskSensitiveValues } from "../util/security.js";

/**
 * Converts Bruno JSON results into Xray JSON format.
 *
 * @param brunoResults the bruno results
 * @param options additional conversion options
 * @returns the Xray JSON results
 */
export function convertBrunoToXray(
  brunoResults: BrunoIteration[],
  options: {
    /**
     * Additional evidence to upload to the test results.
     */
    evidence?: {
      /**
       * The path to a Bruno HTML report.
       */
      htmlReportFile?: string;
    };
    /**
     * Sensitive values to mark in all uploaded data.
     */
    maskedValues?: string[];
    /**
     * The data-driven iteration parameters.
     */
    parameters?: Record<string, string>[];
    /**
     * The test execution information that can be used to update existing issues or create new ones.
     */
    testExecution?: PluginTestSuite["config"]["jira"]["testExecution"];
    /**
     * The Jira issue key to attribute the results to.
     */
    testKey: string;
    /**
     * Whether to use Xray cloud JSON format or Xray server JSON format. This is relevant for the
     * status mapping of Bruno's `pass/fail` to Xray's `PASSED/FAILED` (Xray cloud) or
     * `FAILED/FAIL` (Xray server) respectively.
     *
     * @default false
     */
    useCloudFormat?: boolean;
  }
): XrayTestExecutionResults {
  const xrayReport: XrayTestExecutionResults = {
    info: {
      description: "Generated from Bruno JSON report",
      summary: "Bruno test execution",
      ...options.testExecution?.details,
    },
  };
  if (options.testExecution?.key) {
    xrayReport.testExecutionKey = options.testExecution.key;
  }
  if (options.parameters && options.parameters.length !== brunoResults.length) {
    throw new Error(
      `must provide parameters for every iteration (iterations: ${brunoResults.length.toString()}, parameter sets: ${options.parameters.length.toString()})`
    );
  }
  const iterations = getTestIterations(brunoResults, options.parameters);
  const sortedIterations = iterations.sort((a, b) => a.iterationIndex - b.iterationIndex);
  const statusMap = options.useCloudFormat
    ? { fail: "FAILED", pass: "PASSED" }
    : { fail: "FAIL", pass: "PASS" };
  const test = convertToXrayTest(sortedIterations, {
    maskedValues: options.maskedValues,
    statusMap: statusMap,
    testKey: options.testKey,
  });
  xrayReport.tests = [test];
  if (options.evidence?.htmlReportFile) {
    let htmlContent = readFileSync(options.evidence.htmlReportFile, "utf-8");
    if (options.maskedValues) {
      htmlContent = maskSensitiveValues(htmlContent, options.maskedValues);
    }
    const evidence = {
      contentType: "text/html",
      data: Buffer.from(htmlContent).toString("base64"),
      filename: basename(options.evidence.htmlReportFile),
    };
    if (test.evidence) {
      test.evidence = [evidence, ...test.evidence];
    } else {
      test.evidence = [evidence];
    }
  }
  return xrayReport;
}

interface XrayStatusMap {
  fail: string;
  pass: string;
}

function convertToXrayTest(
  iterations: BrunoXrayIteration[],
  options: { maskedValues?: string[]; statusMap: XrayStatusMap; testKey: string }
): XrayTest {
  const test: XrayTest = {
    status: options.statusMap.pass,
    testKey: options.testKey,
  };
  if (iterations.length === 1) {
    const summaries = getIterationSummary(iterations[0]);
    let summaryString = JSON.stringify(summaries, null, 2);
    if (options.maskedValues) {
      summaryString = maskSensitiveValues(summaryString, options.maskedValues);
    }
    test.evidence = [getEvidence(summaryString, "application/json", "summary.json")];
    if (summaries.some((summary) => summary.errors.length > 0)) {
      test.status = options.statusMap.fail;
    }
  } else {
    const results: XrayIterationResult[] = [];
    for (const iteration of iterations) {
      const parameters: Record<string, string> = {
        iteration: (iteration.iterationIndex + 1).toString(),
        ...iteration.parameters,
      };
      const iterationResult: XrayIterationResult = {
        parameters: Object.entries(parameters).map((entry) => {
          return {
            name: entry[0],
            value: entry[1],
          };
        }),
        status: options.statusMap.pass,
      };
      const summaries = getIterationSummary(iteration);
      let summaryString = JSON.stringify(summaries, null, 2);
      if (options.maskedValues) {
        summaryString = maskSensitiveValues(summaryString, options.maskedValues);
      }
      if (summaries.some((summary) => summary.errors.length > 0)) {
        iterationResult.status = options.statusMap.fail;
      }
      const evidence = getEvidence(
        summaryString,
        "application/json",
        `iteration ${(iteration.iterationIndex + 1).toString()} ${iterationResult.status}.json`
      );
      if (test.evidence) {
        test.evidence.push(evidence);
      } else {
        test.evidence = [evidence];
      }
      results.push(iterationResult);
      test.iterations = results;
    }
    if (test.iterations?.some((iteration) => iteration.status === options.statusMap.fail)) {
      test.status = options.statusMap.fail;
    }
  }
  return test;
}

interface RequestSummary {
  errors: { error: string; test: string }[];
  request: BrunoRequest;
  response: BrunoResponse;
}

function getIterationSummary(iteration: BrunoXrayIteration): RequestSummary[] {
  const summaries: RequestSummary[] = [];
  for (const result of iteration.requests) {
    const summary: RequestSummary = {
      errors: [],
      request: result.request,
      response: result.response,
    };
    if (result.error) {
      summary.errors.push({ error: result.error, test: "internal Bruno error" });
    }
    for (const assertion of result.assertionResults) {
      if (assertion.error) {
        summary.errors.push({
          error: assertion.error,
          test: `${assertion.lhsExpr} ${assertion.rhsExpr}`,
        });
      }
    }
    for (const test of result.testResults) {
      if (test.error) {
        summary.errors.push({ error: test.error, test: test.description });
      }
    }
    summaries.push(summary);
  }
  return summaries;
}

function getEvidence(data: string, contentType: string, filename: string): XrayEvidenceItem {
  return {
    contentType,
    data: Buffer.from(data).toString("base64"),
    filename,
  };
}

interface BrunoXrayIteration {
  iterationIndex: number;
  parameters: Record<string, string>;
  requests: [BrunoRequestResult, ...BrunoRequestResult[]];
}

/**
 * Builds a mapping of Jira issue keys to their relevant Bruno requests.
 *
 * @param iterations all Bruno iterations
 * @param parameters the Bruno iteration parameters
 * @returns the Bruno requests grouped by Jira issue keys
 */
function getTestIterations(
  iterations: BrunoIteration[],
  parameters?: Record<string, string>[]
): BrunoXrayIteration[] {
  const xrayIterations: BrunoXrayIteration[] = [];
  for (const iteration of iterations) {
    if (iteration.results.length === 0) {
      continue;
    }
    xrayIterations.push({
      iterationIndex: iteration.iterationIndex,
      parameters: parameters ? parameters[iteration.iterationIndex] : {},
      requests: [iteration.results[0], ...iteration.results.slice(1)],
    });
  }
  return xrayIterations;
}
