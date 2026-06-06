import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { ChangedFile, DiffHunk } from "./types.js";

const execFileAsync = promisify(execFile);

export async function git(args: string[], cwd: string): Promise<string> {
  const { stdout } = await execFileAsync("git", args, {
    cwd,
    maxBuffer: 20 * 1024 * 1024
  });
  return stdout.toString();
}

export async function getProjectName(cwd: string): Promise<string> {
  try {
    const top = (await git(["rev-parse", "--show-toplevel"], cwd)).trim();
    return top.split(/[\\/]/).filter(Boolean).at(-1) ?? "repository";
  } catch {
    return cwd.split(/[\\/]/).filter(Boolean).at(-1) ?? "repository";
  }
}

export async function getChangedFiles(base: string, cwd: string): Promise<ChangedFile[]> {
  const [nameStatus, numstat, patch] = await Promise.all([
    git(["diff", "--name-status", base], cwd),
    git(["diff", "--numstat", base], cwd),
    git(["diff", "--unified=0", base], cwd)
  ]);

  const stats = parseNumstat(numstat);
  const hunks = parsePatchHunks(patch);

  return nameStatus
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const [status, ...rest] = line.split(/\t/);
      const path = rest.at(-1) ?? "";
      const stat = stats.get(path) ?? { additions: 0, deletions: 0 };
      return {
        path,
        status,
        additions: stat.additions,
        deletions: stat.deletions,
        hunks: hunks.get(path) ?? []
      };
    })
    .filter((file) => file.path.length > 0);
}

function parseNumstat(input: string): Map<string, { additions: number; deletions: number }> {
  const result = new Map<string, { additions: number; deletions: number }>();

  for (const line of input.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const [additionsRaw, deletionsRaw, ...pathParts] = line.split(/\t/);
    const path = pathParts.at(-1);
    if (!path) continue;
    result.set(path, {
      additions: parseInt(additionsRaw, 10) || 0,
      deletions: parseInt(deletionsRaw, 10) || 0
    });
  }

  return result;
}

function parsePatchHunks(input: string): Map<string, DiffHunk[]> {
  const result = new Map<string, DiffHunk[]>();
  let currentFile = "";
  let currentHunk: DiffHunk | undefined;

  for (const line of input.split(/\r?\n/)) {
    if (line.startsWith("diff --git ")) {
      currentFile = "";
      currentHunk = undefined;
      continue;
    }

    if (line.startsWith("+++ b/")) {
      currentFile = line.slice("+++ b/".length);
      if (!result.has(currentFile)) result.set(currentFile, []);
      continue;
    }

    const hunk = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@\s?(.*)$/);
    if (hunk && currentFile) {
      currentHunk = {
        oldStart: Number(hunk[1]),
        oldLines: Number(hunk[2] ?? "1"),
        newStart: Number(hunk[3]),
        newLines: Number(hunk[4] ?? "1"),
        heading: hunk[5] ?? "",
        addedLines: [],
        removedLines: []
      };
      result.get(currentFile)?.push(currentHunk);
      continue;
    }

    if (!currentHunk) continue;
    if (line.startsWith("+") && !line.startsWith("+++")) {
      currentHunk.addedLines.push(line.slice(1));
    } else if (line.startsWith("-") && !line.startsWith("---")) {
      currentHunk.removedLines.push(line.slice(1));
    }
  }

  return result;
}
