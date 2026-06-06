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

  it("does not flag common GitHub Action expressions as secrets", () => {
    const risks = scoreRisks([
      {
        path: "docs/github-action.md",
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
            addedLines: ["- run: tool --base origin/${{ github.base_ref }}"],
            removedLines: []
          }
        ]
      }
    ]);

    expect(risks).toEqual([]);
  });

  it("maps scores to levels", () => {
    expect(riskLevel(5)).toBe("low");
    expect(riskLevel(25)).toBe("medium");
    expect(riskLevel(60)).toBe("high");
  });
});
