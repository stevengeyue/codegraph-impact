export type AgentName = "codex" | "claude" | "cursor" | "generic";

export interface CliOptions {
  base: string;
  cwd: string;
  outDir: string;
  agent: AgentName;
  format: "text" | "json";
  report: boolean;
  context: boolean;
  maxFiles: number;
}

export interface ChangedFile {
  path: string;
  status: string;
  additions: number;
  deletions: number;
  hunks: DiffHunk[];
}

export interface DiffHunk {
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  heading: string;
  addedLines: string[];
  removedLines: string[];
}

export interface SymbolCandidate {
  name: string;
  kind: "function" | "class" | "method" | "route" | "export" | "unknown";
  file: string;
  line?: number;
  confidence: "high" | "medium" | "low";
}

export interface RiskSignal {
  label: string;
  detail: string;
  score: number;
}

export interface TestSuggestion {
  path: string;
  reason: string;
  command?: string;
}

export interface CodeGraphProbe {
  available: boolean;
  version?: string;
  status?: string;
  error?: string;
}

export interface ImpactReport {
  project: string;
  base: string;
  generatedAt: string;
  changedFiles: ChangedFile[];
  symbols: SymbolCandidate[];
  tests: TestSuggestion[];
  risks: RiskSignal[];
  codegraph: CodeGraphProbe;
  summary: {
    files: number;
    additions: number;
    deletions: number;
    riskScore: number;
    riskLevel: "low" | "medium" | "high";
  };
}
