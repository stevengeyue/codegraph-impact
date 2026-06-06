import fs from "node:fs/promises";
import path from "node:path";
import pc from "picocolors";
import type { AgentName, ImpactReport } from "./types.js";
import { codeGraphCommands } from "./codegraph.js";

export function renderText(report: ImpactReport): string {
  const riskColor = report.summary.riskLevel === "high" ? pc.red : report.summary.riskLevel === "medium" ? pc.yellow : pc.green;
  const lines: string[] = [];

  lines.push(pc.bold("CodeGraph Impact"));
  lines.push("");
  lines.push(`Project: ${pc.cyan(report.project)}`);
  lines.push(`Base: ${report.base}`);
  lines.push(`Changed: ${report.summary.files} files, +${report.summary.additions}/-${report.summary.deletions}`);
  lines.push(`Risk: ${riskColor(`${report.summary.riskLevel.toUpperCase()} (${report.summary.riskScore})`)}`);
  lines.push(`CodeGraph: ${report.codegraph.available ? pc.green(`available ${report.codegraph.version ?? ""}`) : pc.gray("not detected; using git diff heuristics")}`);
  lines.push("");

  lines.push(pc.bold("Changed Files"));
  for (const file of report.changedFiles.slice(0, 15)) {
    lines.push(`- ${file.status.padEnd(2)} ${file.path} ${pc.green(`+${file.additions}`)} ${pc.red(`-${file.deletions}`)}`);
  }
  if (report.changedFiles.length > 15) lines.push(`- ... ${report.changedFiles.length - 15} more`);
  lines.push("");

  lines.push(pc.bold("Likely Changed Symbols"));
  if (report.symbols.length === 0) {
    lines.push("- No obvious symbols found in the diff.");
  } else {
    for (const symbol of report.symbols.slice(0, 12)) {
      lines.push(`- ${symbol.kind} ${pc.cyan(symbol.name)} (${symbol.file}${symbol.line ? `:${symbol.line}` : ""})`);
    }
  }
  lines.push("");

  lines.push(pc.bold("Risk Signals"));
  if (report.risks.length === 0) {
    lines.push("- No high-signal risks detected.");
  } else {
    for (const risk of report.risks.slice(0, 8)) {
      lines.push(`- [${risk.score}] ${risk.label}: ${risk.detail}`);
    }
  }
  lines.push("");

  lines.push(pc.bold("Suggested Tests"));
  if (report.tests.length === 0) {
    lines.push("- No nearby tests found. Run your normal project test suite.");
  } else {
    for (const test of report.tests.slice(0, 8)) {
      lines.push(`- ${test.path}${test.command ? pc.gray(`  ${test.command}`) : ""}`);
    }
  }

  return lines.join("\n");
}

export function renderJson(report: ImpactReport): string {
  return JSON.stringify(report, null, 2);
}

export async function writeArtifacts(report: ImpactReport, outDir: string, agent: AgentName, writeHtml: boolean, writeContext: boolean): Promise<string[]> {
  await fs.mkdir(outDir, { recursive: true });
  const written: string[] = [];

  if (writeContext) {
    const target = path.join(outDir, "agent-context.md");
    await fs.writeFile(target, renderAgentContext(report, agent), "utf8");
    written.push(target);
  }

  if (writeHtml) {
    const target = path.join(outDir, "report.html");
    await fs.writeFile(target, renderHtml(report), "utf8");
    written.push(target);
  }

  const jsonTarget = path.join(outDir, "impact.json");
  await fs.writeFile(jsonTarget, renderJson(report), "utf8");
  written.push(jsonTarget);

  return written;
}

export function renderAgentContext(report: ImpactReport, agent: AgentName): string {
  const commands = codeGraphCommands(report.symbols);
  const agentLine = agent === "generic" ? "AI coding agent" : agent;
  return `# CodeGraph Impact Context

You are ${agentLine}. Use this impact pack before editing or reviewing this change.

## Summary

- Project: ${report.project}
- Base: ${report.base}
- Changed files: ${report.summary.files}
- Churn: +${report.summary.additions}/-${report.summary.deletions}
- Risk: ${report.summary.riskLevel} (${report.summary.riskScore})
- CodeGraph: ${report.codegraph.available ? `available ${report.codegraph.version ?? ""}` : "not detected when this pack was generated"}

## Changed Files

${report.changedFiles.map((file) => `- ${file.status} ${file.path} (+${file.additions}/-${file.deletions})`).join("\n")}

## Likely Changed Symbols

${report.symbols.length ? report.symbols.map((symbol) => `- ${symbol.kind} \`${symbol.name}\` in \`${symbol.file}\`${symbol.line ? ` around line ${symbol.line}` : ""}`).join("\n") : "- No obvious symbols found in the diff."}

## Risk Signals

${report.risks.length ? report.risks.map((risk) => `- [${risk.score}] ${risk.label}: ${risk.detail}`).join("\n") : "- No high-signal risks detected."}

## Suggested Verification

${report.tests.length ? report.tests.map((test) => `- ${test.command ?? test.path} (${test.reason})`).join("\n") : "- Run the repository's normal test suite."}

## CodeGraph Follow-ups

${commands.length ? commands.map((command) => `- \`${command}\``).join("\n") : "- If CodeGraph is installed, run \`codegraph impact <symbol>\` on the key changed symbols."}

## Agent Guardrails

- Start with the changed symbols and risk signals above.
- Prefer CodeGraph impact/callers/callees before broad grep-style exploration.
- Do not edit unrelated files unless the impact chain explains why.
- Verify the suggested tests or explain why a different verification path is better.
`;
}

function renderHtml(report: ImpactReport): string {
  const riskClass = report.summary.riskLevel;
  const changedFiles = report.changedFiles.map((file) => `<tr><td>${escapeHtml(file.status)}</td><td>${escapeHtml(file.path)}</td><td class="add">+${file.additions}</td><td class="del">-${file.deletions}</td></tr>`).join("");
  const symbols = report.symbols.map((symbol) => `<li><strong>${escapeHtml(symbol.name)}</strong><span>${escapeHtml(symbol.kind)} · ${escapeHtml(symbol.file)}</span></li>`).join("") || "<li><span>No obvious symbols found.</span></li>";
  const risks = report.risks.map((risk) => `<li><strong>${risk.score}</strong><span>${escapeHtml(risk.label)} · ${escapeHtml(risk.detail)}</span></li>`).join("") || "<li><span>No high-signal risks detected.</span></li>";
  const tests = report.tests.map((test) => `<li><strong>${escapeHtml(test.path)}</strong><span>${escapeHtml(test.command ?? test.reason)}</span></li>`).join("") || "<li><span>Run the repository's normal test suite.</span></li>";

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CodeGraph Impact Report</title>
  <style>
    :root { color-scheme: light dark; font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
    body { margin: 0; background: #0f1216; color: #eef2f6; }
    main { max-width: 1120px; margin: 0 auto; padding: 40px 24px 56px; }
    header { display: flex; justify-content: space-between; gap: 24px; align-items: flex-start; border-bottom: 1px solid #2a313a; padding-bottom: 28px; }
    h1 { margin: 0 0 8px; font-size: 40px; line-height: 1.05; }
    p { color: #aeb8c4; margin: 0; }
    .badge { border: 1px solid #405063; padding: 8px 12px; border-radius: 6px; text-transform: uppercase; font-weight: 700; letter-spacing: 0; }
    .badge.low { color: #79d98b; border-color: #285a34; }
    .badge.medium { color: #ffd166; border-color: #6b5720; }
    .badge.high { color: #ff7b7b; border-color: #743333; }
    .stats { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin: 28px 0; }
    .stat, section { background: #171c22; border: 1px solid #2a313a; border-radius: 8px; }
    .stat { padding: 16px; }
    .stat strong { display: block; font-size: 28px; }
    .stat span, li span { color: #aeb8c4; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
    section { padding: 18px; margin-bottom: 16px; }
    h2 { margin: 0 0 14px; font-size: 18px; }
    table { width: 100%; border-collapse: collapse; font-size: 14px; }
    td { border-top: 1px solid #29313a; padding: 10px 8px; }
    ul { margin: 0; padding: 0; list-style: none; }
    li { display: grid; gap: 4px; padding: 10px 0; border-top: 1px solid #29313a; }
    li:first-child, tr:first-child td { border-top: 0; }
    .add { color: #79d98b; }
    .del { color: #ff7b7b; }
    @media (max-width: 760px) {
      header, .grid { display: block; }
      .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      h1 { font-size: 30px; }
      .badge { display: inline-block; margin-top: 16px; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <h1>CodeGraph Impact</h1>
        <p>${escapeHtml(report.project)} · base ${escapeHtml(report.base)} · ${escapeHtml(report.generatedAt)}</p>
      </div>
      <div class="badge ${riskClass}">${report.summary.riskLevel} risk</div>
    </header>
    <div class="stats">
      <div class="stat"><strong>${report.summary.files}</strong><span>files</span></div>
      <div class="stat"><strong>+${report.summary.additions}</strong><span>additions</span></div>
      <div class="stat"><strong>-${report.summary.deletions}</strong><span>deletions</span></div>
      <div class="stat"><strong>${report.summary.riskScore}</strong><span>risk score</span></div>
    </div>
    <section>
      <h2>Changed Files</h2>
      <table>${changedFiles}</table>
    </section>
    <div class="grid">
      <section><h2>Likely Symbols</h2><ul>${symbols}</ul></section>
      <section><h2>Risk Signals</h2><ul>${risks}</ul></section>
    </div>
    <section><h2>Suggested Tests</h2><ul>${tests}</ul></section>
  </main>
</body>
</html>`;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
