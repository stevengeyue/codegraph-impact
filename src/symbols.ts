import type { ChangedFile, SymbolCandidate } from "./types.js";

const patterns: Array<{
  kind: SymbolCandidate["kind"];
  regex: RegExp;
  confidence: SymbolCandidate["confidence"];
}> = [
  { kind: "route", regex: /\b(?:app|router|route)\.(?:get|post|put|patch|delete|use)\s*\(\s*["'`]([^"'`]+)["'`]/i, confidence: "high" },
  { kind: "route", regex: /@(?:Get|Post|Put|Patch|Delete|Controller|RequestMapping)\s*\(\s*["'`]?([^"'`)]*)/i, confidence: "high" },
  { kind: "function", regex: /\bfunction\s+([A-Za-z_$][\w$]*)\s*\(/, confidence: "high" },
  { kind: "function", regex: /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?\(/, confidence: "high" },
  { kind: "function", regex: /\b(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:async\s*)?[A-Za-z_$][\w$]*\s*=>/, confidence: "high" },
  { kind: "class", regex: /\bclass\s+([A-Za-z_$][\w$]*)\b/, confidence: "high" },
  { kind: "method", regex: /^\s*(?:async\s+)?([A-Za-z_$][\w$]*)\s*\([^)]*\)\s*\{?/, confidence: "medium" },
  { kind: "export", regex: /\bexport\s+(?:default\s+)?(?:const|let|var|class|function|interface|type)\s+([A-Za-z_$][\w$]*)/, confidence: "high" },
  { kind: "function", regex: /\bdef\s+([A-Za-z_]\w*)\s*\(/, confidence: "high" },
  { kind: "class", regex: /\bclass\s+([A-Za-z_]\w*)\s*[:(]?/, confidence: "high" },
  { kind: "function", regex: /\bfunc\s+([A-Za-z_]\w*)\s*\(/, confidence: "high" },
  { kind: "function", regex: /\bfn\s+([A-Za-z_]\w*)\s*[<(]/, confidence: "high" },
  { kind: "function", regex: /\b(?:public|private|protected|static|final|suspend|fun)\s+.*?\b([A-Za-z_]\w*)\s*\(/, confidence: "medium" }
];

export function inferChangedSymbols(files: ChangedFile[]): SymbolCandidate[] {
  const seen = new Set<string>();
  const symbols: SymbolCandidate[] = [];

  for (const file of files) {
    for (const hunk of file.hunks) {
      const candidateLines = [...hunk.addedLines, hunk.heading].filter(Boolean);
      for (const line of candidateLines) {
        for (const pattern of patterns) {
          const match = line.match(pattern.regex);
          if (!match) continue;
          const name = match[1]?.trim();
          if (!name || name.length > 120) continue;
          const key = `${file.path}:${pattern.kind}:${name}`;
          if (seen.has(key)) continue;
          seen.add(key);
          symbols.push({
            name,
            kind: pattern.kind,
            file: file.path,
            line: hunk.newStart,
            confidence: pattern.confidence
          });
        }
      }
    }
  }

  return symbols;
}
