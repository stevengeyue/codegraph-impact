import { describe, expect, it } from "vitest";
import { renderPrComment } from "../src/report.js";
import type { ImpactReport } from "../src/types.js";

describe("renderPrComment", () => {
  it("renders a compact GitHub markdown summary", () => {
    const report: ImpactReport = {
      project: "demo",
      base: "main",
      generatedAt: "2026-06-07T00:00:00.000Z",
      changedFiles: [],
      symbols: [{ name: "parseToken", kind: "function", file: "src/auth.ts", confidence: "high" }],
      tests: [{ path: "src/auth.test.ts", reason: "Near changed file", command: "npm test -- src/auth.test.ts" }],
      risks: [{ label: "Authentication or authorization path changed", detail: "src/auth.ts", score: 25 }],
      codegraph: { available: true, version: "0.9.9" },
      summary: {
        files: 1,
        additions: 10,
        deletions: 2,
        riskScore: 25,
        riskLevel: "medium"
      }
    };

    expect(renderPrComment(report)).toContain("## CodeGraph Impact");
    expect(renderPrComment(report)).toContain("Risk: **medium** (25)");
    expect(renderPrComment(report)).toContain("`parseToken`");
    expect(renderPrComment(report)).toContain("npm test -- src/auth.test.ts");
  });
});
