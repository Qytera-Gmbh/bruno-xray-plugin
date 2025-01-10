import type {
  BrunoIteration,
  BrunoRequest,
  BrunoRequestResult,
  BrunoResponse,
} from "../model/bruno-model.js";
import type {
  XrayEvidenceItem,
  XrayIterationResultCloud,
  XrayIterationResultServer,
  XrayTestCloud,
  XrayTestExecutionResults,
  XrayTestServer,
} from "../model/xray-model.js";

/**
 * Converts Bruno JSON results into Xray JSON format.
 *
 * @param brunoResults the bruno results
 * @param options additional conversion options
 * @returns the Xray JSON results
 */
export function convertBrunoToXray(
  brunoResults: BrunoIteration[],
  options?: {
    /**
     * The description to assign to the test execution issue.
     *
     * @default "Generated from Bruno JSON report"
     */
    description?: string;
    /**
     * The data-driven iteration parameters.
     */
    parameters?: Record<string, string>[];
    /**
     * The summary to assign to the test execution issue.
     *
     * @default "Bruno test execution"
     */
    summary?: string;
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
      description: options?.description ?? "Generated from Bruno JSON report",
      summary: options?.summary ?? "Bruno test execution",
    },
  };
  if (options?.parameters && options.parameters.length !== brunoResults.length) {
    throw new Error(
      `must provide parameters for every iteration (iterations: ${brunoResults.length.toString()}, parameter sets: ${options.parameters.length.toString()})`
    );
  }
  const iterations = getTestIterations(brunoResults, options?.parameters);
  for (const [issueKey, brunoIterations] of iterations) {
    const sortedIterations = brunoIterations.sort((a, b) => a.iterationIndex - b.iterationIndex);
    const test = options?.useCloudFormat
      ? convertToXrayCloudTest(sortedIterations, {
          testKey: issueKey,
        })
      : convertToXrayServerTest(sortedIterations, {
          testKey: issueKey,
        });
    if (xrayReport.tests) {
      xrayReport.tests.push(test);
    } else {
      xrayReport.tests = [test];
    }
  }
  return xrayReport;
}

function convertToXrayCloudTest(
  iterations: BrunoXrayTestResult[],
  options: { testKey: string }
): XrayTestCloud {
  const test: XrayTestCloud = {
    status: "PASSED",
    testKey: options.testKey,
  };
  if (iterations.length === 1) {
    const summaries = getIterationSummary(iterations[0]);
    test.evidence = [
      getEvidence(JSON.stringify(summaries, null, 2), "application/json", "summary.json"),
    ];
    if (summaries.some((summary) => summary.errors.length > 0)) {
      test.status = "FAILED";
    }
  } else {
    const results: XrayIterationResultCloud[] = [];
    for (const iteration of iterations) {
      const parameters: Record<string, string> = {
        iteration: (iteration.iterationIndex + 1).toString(),
        ...iteration.parameters,
      };
      const iterationResult: XrayIterationResultCloud = {
        parameters: Object.entries(parameters).map((entry) => {
          return {
            name: entry[0],
            value: entry[1],
          };
        }),
        status: "PASSED",
      };
      const summaries = getIterationSummary(iteration);
      const evidence = getEvidence(
        JSON.stringify(summaries, null, 2),
        "application/json",
        `iteration ${(iteration.iterationIndex + 1).toString()} - summary.json`
      );
      if (test.evidence) {
        test.evidence.push(evidence);
      } else {
        test.evidence = [evidence];
      }
      if (summaries.some((summary) => summary.errors.length > 0)) {
        iterationResult.status = "FAILED";
      }
      results.push(iterationResult);
      test.iterations = results;
    }
    if (test.iterations?.some((iteration) => iteration.status === "FAILED")) {
      test.status = "FAILED";
    }
  }
  return test;
}

function convertToXrayServerTest(
  iterations: BrunoXrayTestResult[],
  options: { testKey: string }
): XrayTestServer {
  const test: XrayTestServer = {
    status: "PASS",
    testKey: options.testKey,
  };
  if (iterations.length === 1) {
    const summaries = getIterationSummary(iterations[0]);
    test.evidence = [
      getEvidence(JSON.stringify(summaries, null, 2), "application/json", "summary.json"),
    ];
    if (summaries.some((summary) => summary.errors.length > 0)) {
      test.status = "FAIL";
    }
  } else {
    const results: XrayIterationResultServer[] = [];
    for (const iteration of iterations) {
      const parameters: Record<string, string> = {
        iteration: (iteration.iterationIndex + 1).toString(),
        ...iteration.parameters,
      };
      const iterationResult: XrayIterationResultServer = {
        parameters: Object.entries(parameters).map((entry) => {
          return {
            name: entry[0],
            value: entry[1],
          };
        }),
        status: "PASS",
      };
      const summaries = getIterationSummary(iteration);
      const evidence = getEvidence(
        JSON.stringify(summaries, null, 2),
        "application/json",
        `iteration ${(iteration.iterationIndex + 1).toString()} - summary.json`
      );
      if (test.evidence) {
        test.evidence.push(evidence);
      } else {
        test.evidence = [evidence];
      }
      if (summaries.some((summary) => summary.errors.length > 0)) {
        iterationResult.status = "FAIL";
      }
      results.push(iterationResult);
      test.iterations = results;
    }
    if (test.iterations?.some((iteration) => iteration.status === "FAIL")) {
      test.status = "FAIL";
    }
  }
  return test;
}

interface RequestSummary {
  errors: { error: string; test: string }[];
  request: BrunoRequest;
  response: BrunoResponse;
}

function getIterationSummary(iteration: BrunoXrayTestResult): RequestSummary[] {
  const summaries: RequestSummary[] = [];
  for (const result of iteration.requests) {
    const summary: RequestSummary = {
      errors: [],
      request: result.request,
      response: result.response,
    };
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

interface BrunoXrayTestResult {
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
): Map<string, BrunoXrayTestResult[]> {
  const map = new Map<string, BrunoXrayTestResult[]>();
  for (const iteration of iterations) {
    for (const result of iteration.results) {
      // Input:  'abc CYP-123 def BFG-664 asoi//QRT-3636'
      // Output: ['CYP-123', 'BFG-664', 'QRT-3636']
      const matches = result.test.filename.match(/\w+-\d+/g);
      for (const issueKey of matches ?? []) {
        let testIterations = map.get(issueKey);
        if (!testIterations) {
          testIterations = [];
          map.set(issueKey, testIterations);
        }
        const iterationRequests = testIterations.find(
          (i) => i.iterationIndex === iteration.iterationIndex
        );
        if (!iterationRequests) {
          testIterations.push({
            iterationIndex: iteration.iterationIndex,
            parameters: parameters ? parameters[iteration.iterationIndex] : {},
            requests: [result],
          });
        } else {
          iterationRequests.requests.push(result);
        }
      }
    }
  }
  return map;
}
