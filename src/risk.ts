import type { ChangedFile, RiskSignal } from "./types.js";

const riskyPathPatterns: Array<[RegExp, string, number]> = [
  [/(^|\/)(auth|login|session|jwt|oauth|permission|acl)(\/|\.|-|_)/i, "Authentication or authorization path changed", 25],
  [/(^|\/)(billing|payment|checkout|invoice|stripe|paypal)(\/|\.|-|_)/i, "Billing or payment path changed", 25],
  [/(^|\/)(db|database|migration|schema|models?)(\/|\.|-|_)/i, "Database or schema path changed", 20],
  [/(^|\/)(api|routes?|controllers?|handlers?)(\/|\.|-|_)/i, "API surface changed", 15],
  [/(^|\/)(config|settings|env)(\/|\.|-|_)/i, "Configuration path changed", 15],
  [/package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$|package\.json$/i, "Dependency or package metadata changed", 15],
  [/Dockerfile$|docker-compose|\.github\/workflows|\.gitlab-ci|build\.gradle|pom\.xml/i, "Build or CI path changed", 15]
];

const riskyLinePatterns: Array<[RegExp, string, number]> = [
  [/\b(delete|drop|truncate|rm\s+-rf|dangerouslySetInnerHTML)\b/i, "Potentially destructive operation introduced", 20],
  [/\b(eval|exec|spawn|child_process|subprocess|shell=True)\b/i, "Dynamic execution or shell boundary changed", 20],
  [/\b(secret|token|password|api[_-]?key|private[_-]?key)\b/i, "Secret-like identifier touched", 15],
  [/\b(public|cors|origin|cookie|secure|sameSite|csrf)\b/i, "Security-sensitive web setting touched", 12]
];

export function scoreRisks(files: ChangedFile[]): RiskSignal[] {
  const risks: RiskSignal[] = [];

  for (const file of files) {
    for (const [regex, label, score] of riskyPathPatterns) {
      if (regex.test(file.path)) {
        risks.push({ label, detail: file.path, score });
      }
    }

    const changedLines = file.hunks.flatMap((hunk) => hunk.addedLines);
    for (const line of changedLines) {
      for (const [regex, label, score] of riskyLinePatterns) {
        if (isCommonCiSyntax(line)) continue;
        if (regex.test(line)) {
          risks.push({
            label,
            detail: `${file.path}: ${line.trim().slice(0, 120)}`,
            score
          });
        }
      }
    }

    const churn = file.additions + file.deletions;
    if (churn > 300) {
      risks.push({ label: "Large change set", detail: `${file.path} has ${churn} changed lines`, score: 20 });
    } else if (churn > 100) {
      risks.push({ label: "Medium change set", detail: `${file.path} has ${churn} changed lines`, score: 10 });
    }
  }

  return dedupeRisks(risks);
}

function isCommonCiSyntax(line: string): boolean {
  return /\$\{\{\s*github\.(base_ref|head_ref|ref|sha|event|event_name)/i.test(line);
}

function dedupeRisks(risks: RiskSignal[]): RiskSignal[] {
  const seen = new Set<string>();
  return risks.filter((risk) => {
    const key = `${risk.label}:${risk.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function riskLevel(score: number): "low" | "medium" | "high" {
  if (score >= 60) return "high";
  if (score >= 25) return "medium";
  return "low";
}
