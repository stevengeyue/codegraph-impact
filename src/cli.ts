#!/usr/bin/env node
import path from "node:path";
import { Command, InvalidArgumentError } from "commander";
import pc from "picocolors";
import { analyze } from "./analyze.js";
import { renderJson, renderPrComment, renderText, writeArtifacts } from "./report.js";
import type { AgentName, CliOptions } from "./types.js";

const program = new Command();

program
  .name("codegraph-impact")
  .description("Turn git diffs into impact reports, test suggestions, and AI-agent context packs.")
  .option("-b, --base <ref>", "git ref to compare against", "HEAD")
  .option("-C, --cwd <path>", "repository directory", process.cwd())
  .option("-o, --out-dir <path>", "artifact output directory", ".codegraph-impact")
  .option("--agent <name>", "agent context style: codex, claude, cursor, generic", parseAgent, "codex")
  .option("--format <format>", "output format: text or json", parseFormat, "text")
  .option("--report", "write an HTML report", false)
  .option("--pr-comment", "print a GitHub PR Markdown comment")
  .option("--no-context", "skip writing agent-context.md")
  .option("--max-files <n>", "maximum changed files to analyze", parsePositiveInt, 200)
  .action(async (rawOptions) => {
    const cwd = path.resolve(rawOptions.cwd);
    const options: CliOptions = {
      base: rawOptions.base,
      cwd,
      outDir: path.resolve(cwd, rawOptions.outDir),
      agent: rawOptions.agent,
      format: rawOptions.format,
      report: rawOptions.report,
      context: rawOptions.context,
      maxFiles: rawOptions.maxFiles
    };

    try {
      const report = await analyze(options);
      if (rawOptions.prComment) {
        process.stdout.write(`${renderPrComment(report)}\n`);
      } else {
        process.stdout.write(options.format === "json" ? `${renderJson(report)}\n` : `${renderText(report)}\n`);
      }

      const written = await writeArtifacts(report, options.outDir, options.agent, options.report, options.context);
      if (options.format === "text" && !rawOptions.prComment) {
        process.stdout.write("\n");
        process.stdout.write(pc.bold("Artifacts\n"));
        for (const file of written) process.stdout.write(`- ${path.relative(cwd, file)}\n`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      process.stderr.write(`${pc.red("error")} ${message}\n`);
      process.exitCode = 1;
    }
  });

program.parse();

function parseAgent(value: string): AgentName {
  if (["codex", "claude", "cursor", "generic"].includes(value)) return value as AgentName;
  throw new InvalidArgumentError("agent must be one of: codex, claude, cursor, generic");
}

function parseFormat(value: string): "text" | "json" {
  if (value === "text" || value === "json") return value;
  throw new InvalidArgumentError("format must be text or json");
}

function parsePositiveInt(value: string): number {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new InvalidArgumentError("must be a positive integer");
  return parsed;
}
