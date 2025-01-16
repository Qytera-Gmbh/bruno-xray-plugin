// Models acquired from an actual test report. There are no official definitions.

export interface BrunoIteration {
  iterationIndex: number;
  results: BrunoRequestResult[];
  summary: BrunoSummary;
}

export interface BrunoSummary {
  failedAssertions: number;
  failedRequests: number;
  failedTests: number;
  passedAssertions: number;
  passedRequests: number;
  passedTests: number;
  totalAssertions: number;
  totalRequests: number;
  totalTests: number;
}

export interface BrunoRequestResult {
  assertionResults: BrunoAssertionResult[];
  error: null | string;
  iterationIndex: number;
  request: BrunoRequest;
  response: BrunoResponse;
  runtime: number;
  suitename: string;
  test: BrunoTest;
  testResults: BrunoTestResult[];
}

export interface BrunoTest {
  filename: string;
}

export interface BrunoRequest {
  data?: unknown;
  headers: Record<string, string>;
  method: string;
  url: string;
}

export interface BrunoResponse {
  data: unknown;
  headers: null | Record<string, string>;
  responseTime: number;
  status: null | number;
  statusText: null | string;
}

export interface BrunoAssertionResult {
  error?: string;
  lhsExpr: string;
  operator: string;
  rhsExpr: string;
  rhsOperand: string;
  status: "fail" | "pass";
  uid: string;
}

export interface BrunoTestResult {
  actual?: number;
  description: string;
  error?: string;
  expected?: number;
  status: "fail" | "pass";
  uid: string;
}
