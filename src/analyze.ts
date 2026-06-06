import path from "node:path";
import type { CliOptions, ImpactReport } from "./types.js";
import { getChangedFiles, getProjectName } from "./git.js";
import { inferChangedSymbols } from "./symbols.js";
import { riskLevel, scoreRisks } from "./risk.js";
import { suggestTests } from "./tests.js";
import { probeCodeGraph } from "./codegraph.js";

export async function analyze(options: CliOptions): Promise<ImpactReport> {
  const cwd = path.resolve(options.cwd);
  const changedFiles = (await getChangedFiles(options.base, cwd)).slice(0, options.maxFiles);
  const [project, codegraph, tests] = await Promise.all([
    getProjectName(cwd),
    probeCodeGraph(cwd),
    suggestTests(changedFiles, cwd)
  ]);
  const symbols = inferChangedSymbols(changedFiles);
  const risks = scoreRisks(changedFiles);
  const riskScore = Math.min(
    100,
    risks.reduce((sum, risk) => sum + risk.score, 0) + Math.max(0, changedFiles.length - 5) * 2
  );

  return {
    project,
    base: options.base,
    generatedAt: new Date().toISOString(),
    changedFiles,
    symbols,
    tests,
    risks,
    codegraph,
    summary: {
      files: changedFiles.length,
      additions: changedFiles.reduce((sum, file) => sum + file.additions, 0),
      deletions: changedFiles.reduce((sum, file) => sum + file.deletions, 0),
      riskScore,
      riskLevel: riskLevel(riskScore)
    }
  };
}
