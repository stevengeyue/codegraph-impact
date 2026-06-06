import { describe, expect, it } from "vitest";
import { riskLevel, scoreRisks } from "../src/risk.js";
import type { ChangedFile } from "../src/types.js";

describe("risk", () => {
  it("scores sensitive paths and lines", () => {
    const risks = scoreRisks([
      {
        path: "src/auth/session.ts",
        status: "M",
        additions: 1,
        deletions: 0,
        hunks: [
          {
            oldStart: 1,
            oldLines: 1,
            newStart: 1,
            newLines: 1,
            heading: "",
            addedLines: ["const token = eval(raw)"],
            removedLines: []
          }
        ]
      }
    ]);

    expect(risks.map((risk) => risk.label)).toContain("Authentication or authorization path changed");
    expect(risks.map((risk) => risk.label)).toContain("Dynamic execution or shell boundary changed");
  });

  it("maps scores to levels", () => {
    expect(riskLevel(5)).toBe("low");
    expect(riskLevel(25)).toBe("medium");
    expect(riskLevel(60)).toBe("high");
  });
});
