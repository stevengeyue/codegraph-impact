import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { CodeGraphProbe, SymbolCandidate } from "./types.js";

const execFileAsync = promisify(execFile);

export async function probeCodeGraph(cwd: string): Promise<CodeGraphProbe> {
  try {
    const { stdout } = await execFileAsync("codegraph", ["--version"], { cwd, timeout: 5000 });
    const version = stdout.toString().trim();
    return { available: true, version };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message.split(/\r?\n/)[0] : "CodeGraph not found"
    };
  }
}

export function codeGraphCommands(symbols: SymbolCandidate[]): string[] {
  return symbols
    .filter((symbol) => symbol.confidence !== "low")
    .slice(0, 8)
    .map((symbol) => `codegraph impact ${shellQuote(symbol.name)}`);
}

function shellQuote(value: string): string {
  if (/^[A-Za-z0-9_./:-]+$/.test(value)) return value;
  return JSON.stringify(value);
}
