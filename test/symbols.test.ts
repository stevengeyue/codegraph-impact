import { describe, expect, it } from "vitest";
import { inferChangedSymbols } from "../src/symbols.js";
import type { ChangedFile } from "../src/types.js";

describe("inferChangedSymbols", () => {
  it("extracts functions, classes, and routes from diff hunks", () => {
    const files: ChangedFile[] = [
      {
        path: "src/auth.ts",
        status: "M",
        additions: 3,
        deletions: 0,
        hunks: [
          {
            oldStart: 1,
            oldLines: 0,
            newStart: 10,
            newLines: 3,
            heading: "",
            addedLines: [
              "export function parseToken(value: string) {",
              "class SessionStore {",
              "router.post('/login', loginHandler)"
            ],
            removedLines: []
          }
        ]
      }
    ];

    expect(inferChangedSymbols(files)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "parseToken", kind: "function" }),
        expect.objectContaining({ name: "SessionStore", kind: "class" }),
        expect.objectContaining({ name: "/login", kind: "route" })
      ])
    );
  });

  it("does not report control-flow keywords as methods", () => {
    const files: ChangedFile[] = [
      {
        path: "src/cli.ts",
        status: "M",
        additions: 1,
        deletions: 0,
        hunks: [
          {
            oldStart: 1,
            oldLines: 0,
            newStart: 1,
            newLines: 1,
            heading: "",
            addedLines: ["if (rawOptions.prComment) {"],
            removedLines: []
          }
        ]
      }
    ];

    expect(inferChangedSymbols(files)).toEqual([]);
  });
});
