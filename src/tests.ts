import path from "node:path";
import fg from "fast-glob";
import type { ChangedFile, TestSuggestion } from "./types.js";

const testGlobs = [
  "**/*.{test,spec}.{js,jsx,ts,tsx,mjs,cjs}",
  "**/{__tests__,test,tests}/**/*.{js,jsx,ts,tsx,py,go,rs,java,kt}",
  "**/test_*.py",
  "**/*_test.go",
  "**/*_test.rs"
];

const ignore = [
  "**/node_modules/**",
  "**/dist/**",
  "**/build/**",
  "**/.git/**",
  "**/.next/**",
  "**/target/**",
  "**/.venv/**"
];

export async function suggestTests(files: ChangedFile[], cwd: string): Promise<TestSuggestion[]> {
  const tests = await fg(testGlobs, { cwd, ignore, onlyFiles: true, dot: false });
  const suggestions: TestSuggestion[] = [];

  for (const file of files) {
    if (isTestFile(file.path)) {
      suggestions.push({
        path: file.path,
        reason: "Changed test file",
        command: commandForTest(file.path)
      });
      continue;
    }

    const stem = normalizeStem(file.path);
    const sameDir = tests.filter((test) => normalizeDir(test) === normalizeDir(file.path));
    const related = tests.filter((test) => normalizeStem(test).includes(stem) || stem.includes(normalizeStem(test)));
    const candidates = [...sameDir, ...related].slice(0, 5);

    for (const candidate of candidates) {
      suggestions.push({
        path: candidate,
        reason: `Near changed file ${file.path}`,
        command: commandForTest(candidate)
      });
    }
  }

  return dedupeSuggestions(suggestions).slice(0, 12);
}

function normalizeDir(file: string): string {
  return path.posix.dirname(file.replace(/\\/g, "/"));
}

function normalizeStem(file: string): string {
  return path.posix
    .basename(file.replace(/\\/g, "/"))
    .replace(/\.(test|spec|stories|d)\b/i, "")
    .replace(/\.[^.]+$/, "")
    .toLowerCase();
}

function isTestFile(file: string): boolean {
  return /(^|\/)(__tests__|tests?|spec)(\/|$)|\.(test|spec)\.|_test\./i.test(file.replace(/\\/g, "/"));
}

function commandForTest(file: string): string {
  const normalized = file.replace(/\\/g, "/");
  if (normalized.endsWith(".py")) return `pytest ${normalized}`;
  if (normalized.endsWith(".go")) return `go test ./${path.posix.dirname(normalized)}`;
  if (normalized.endsWith(".rs")) return "cargo test";
  if (normalized.endsWith(".java") || normalized.endsWith(".kt")) return "./gradlew test";
  return `npm test -- ${normalized}`;
}

function dedupeSuggestions(suggestions: TestSuggestion[]): TestSuggestion[] {
  const seen = new Set<string>();
  return suggestions.filter((suggestion) => {
    if (seen.has(suggestion.path)) return false;
    seen.add(suggestion.path);
    return true;
  });
}
