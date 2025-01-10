// Models acquired from an actual test report. There are no official definitions.

export interface BrunoIteration {
  iterationIndex: number;
  results: Result[];
  summary: Summary;
}

export interface Summary {
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

export interface Result {
  assertionResults: AssertionResult[];
  error: unknown;
  iterationIndex: number;
  request: BrunoRequest;
  response: BrunoResponse;
  runtime: number;
  suitename: string;
  test: Test;
  testResults: TestResult[];
}

export interface Test {
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
  headers: Record<string, string>;
  responseTime: number;
  status: number;
  statusText: string;
}

export interface AssertionResult {
  error?: string;
  lhsExpr: string;
  operator: string;
  rhsExpr: string;
  rhsOperand: string;
  status: "fail" | "pass";
  uid: string;
}

export interface TestResult {
  actual?: number;
  description: string;
  error?: string;
  expected?: number;
  status: "fail" | "pass";
  uid: string;
}
