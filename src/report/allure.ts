import type { Parameter, TestResult } from "allure-js-commons";
import { Stage, Status } from "allure-js-commons";
import { createDefaultWriter, ReporterRuntime } from "allure-js-commons/sdk/reporter";
import { randomUUID } from "node:crypto";
import MIMEType from "whatwg-mimetype";
import type {
  BrunoIteration,
  BrunoRequest,
  BrunoRequestResult,
  BrunoResponse,
} from "../model/bruno-model.js";

export class BrunoAllureReporter {
  private readonly allureRuntime: ReporterRuntime;

  constructor(options: { resultsDir: string }) {
    this.allureRuntime = new ReporterRuntime({
      writer: createDefaultWriter({ resultsDir: options.resultsDir }),
    });
  }

  public addBrunoIteration(
    iteration: BrunoIteration,
    options: { historyId: TestResult["historyId"]; name: string; parameters?: Parameter[] }
  ) {
    const uuid = this.allureRuntime.startTest({
      attachments: [],
      description: undefined,
      descriptionHtml: "<h1>HTML Description</h1>",
      fullName: options.name,
      historyId: options.historyId,
      labels: [{ name: "label-1", value: "ok" }],
      links: [{ url: "https://example.org" }],
      name: options.name,
      parameters: options.parameters,
      stage: Stage.FINISHED,
      status: Status.PASSED,
      statusDetails: {},
      start: undefined,
      stop: undefined,
      testCaseId: undefined,
      steps: [],
      uuid: randomUUID(),
    });
    this.addRequests(uuid, iteration.results);
    this.allureRuntime.stopTest(uuid, {
      duration: iteration.results.map((result) => result.runtime).reduce((a, b) => a + b, 0),
    });
    this.allureRuntime.writeTest(uuid);
  }

  private addRequests(testId: string, results: BrunoRequestResult[]) {
    let testStatus: Status = Status.PASSED;
    for (const result of results) {
      let stepStatus: Status = Status.PASSED;
      const stepId = this.allureRuntime.startStep(testId, null, {
        attachments: [],
        description: "",
        descriptionHtml: "",
        name: `${result.request.method} ${result.suitename}`,
        parameters: [],
        stage: Stage.FINISHED,
        start: 12345,
        status: stepStatus,
        statusDetails: {},
        steps: [],
        stop: 56789,
      });
      if (!stepId) {
        continue;
      }
      this.addAttachmentsRequest(stepId, result.request);
      this.addAttachmentsResponse(stepId, result.response);
      if (result.error) {
        const error = result.error;
        stepStatus = Status.FAILED;
        this.allureRuntime.updateStep(stepId, (step) => {
          step.statusDetails.message = error;
        });
      }
      for (const assertion of result.assertionResults) {
        const subStepId = this.allureRuntime.startStep(testId, stepId, {
          name: `${assertion.lhsExpr} ${assertion.rhsExpr}`,
          status: Status.PASSED,
        });
        if (!subStepId) {
          continue;
        }
        if (assertion.status === "fail") {
          stepStatus = Status.FAILED;
          this.allureRuntime.updateStep(subStepId, (step) => {
            step.status = Status.FAILED;
            step.statusDetails.message = assertion.error;
          });
        }
        this.allureRuntime.stopStep(subStepId);
      }
      for (const test of result.testResults) {
        const subStepId = this.allureRuntime.startStep(testId, stepId, {
          name: test.description,
          status: Status.PASSED,
        });
        if (!subStepId) {
          continue;
        }
        if (test.status === "fail") {
          stepStatus = Status.FAILED;
          this.allureRuntime.updateStep(subStepId, (step) => {
            step.status = Status.FAILED;
            step.statusDetails.actual = test.actual?.toString();
            step.statusDetails.expected = test.expected?.toString();
            step.statusDetails.message = test.error;
          });
        }
      }
      if (stepStatus !== Status.PASSED) {
        this.allureRuntime.updateStep(stepId, (step) => (step.status = stepStatus));
        testStatus = Status.FAILED;
      }
      this.allureRuntime.stopStep(stepId, { duration: result.response.responseTime });
    }
    this.allureRuntime.updateTest(testId, (test) => (test.status = testStatus));
  }

  private addAttachmentsRequest(stepId: string, request: BrunoRequest) {
    this.addAttachment(stepId, "request url", request.url, "text/plain");
    this.addAttachment(stepId, "request headers", request.headers, "application/json");
    if (request.data) {
      this.addAttachment(
        stepId,
        "request body",
        request.data,
        this.getContentType(request.headers)
      );
    }
  }

  private addAttachmentsResponse(stepId: string, response: BrunoResponse) {
    if (response.status) {
      this.addAttachment(stepId, "response status", response.status.toString(), "text/plain");
    }
    if (response.headers) {
      this.addAttachment(stepId, "response headers", response.headers, "application/json");
    }
    if (response.data) {
      this.addAttachment(
        stepId,
        "response body",
        response.data,
        this.getContentType(response.headers)
      );
    }
  }

  private getContentType(headers: null | Record<string, string>) {
    if (headers) {
      for (const [key, value] of Object.entries(headers)) {
        const lowercaseKey = key.toLowerCase();
        if (lowercaseKey === "content-type") {
          return value;
        }
      }
    }
    return "text/plain";
  }

  /**
   *
   * @param stepId
   * @param attachmentName
   * @param contentType
   * @param data
   *
   * @see https://developer.mozilla.org/de/docs/Web/HTTP/MIME_types/Common_types
   */
  private addAttachment(
    stepId: string,
    attachmentName: string,
    data: unknown,
    contentType: string
  ) {
    let essence = contentType;
    let content: Buffer<ArrayBuffer> | undefined = undefined;
    let fileExtension: string | undefined = undefined;
    const mimeType = MIMEType.parse(contentType);
    if (mimeType?.essence) {
      essence = mimeType?.essence;
    }
    if (mimeType) {
      switch (mimeType.type) {
        case "application": {
          switch (mimeType.subtype) {
            case "json": {
              content = Buffer.from(JSON.stringify(data, null, 2), "utf-8");
              fileExtension = ".json";
              break;
            }
            case "javascript": {
              fileExtension = ".js";
              break;
            }
            case "octet-stream": {
              fileExtension = ".bin";
              break;
            }
            case "xml": {
              fileExtension = ".xml";
              break;
            }
          }
          break;
        }
        case "image": {
          switch (mimeType.subtype) {
            case "jpeg":
            case "jpg":
              fileExtension = ".jpg";
              break;
            case "png":
              fileExtension = ".png";
              break;
          }
          break;
        }
        case "text": {
          switch (mimeType.subtype) {
            case "html":
              fileExtension = ".html";
              break;
            case "plain":
              fileExtension = ".txt";
              break;
          }
          break;
        }
      }
    }
    if (!content) {
      content = Buffer.from(data as string, "utf-8");
    }
    this.allureRuntime.writeAttachment(stepId, stepId, attachmentName, content, {
      contentType: essence,
      fileExtension,
    });
  }
}
