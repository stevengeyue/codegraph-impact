#!/usr/bin/env node
import fs from "node:fs";

const path = process.argv[2] ?? ".codegraph-impact/impact.json";
const report = JSON.parse(fs.readFileSync(path, "utf8"));

const lines = [
  "## CodeGraph Impact",
  "",
  `Risk: **${report.summary.riskLevel}** (${report.summary.riskScore})`,
  `Changed: **${report.summary.files} files**, +${report.summary.additions}/-${report.summary.deletions}`,
  "",
  "### Likely Symbols",
  ...(report.symbols.length
    ? report.symbols.slice(0, 8).map((symbol) => `- \`${symbol.name}\` (${symbol.kind}, ${symbol.file})`)
    : ["- No obvious symbols found."]),
  "",
  "### Risk Signals",
  ...(report.risks.length
    ? report.risks.slice(0, 8).map((risk) => `- [${risk.score}] ${risk.label}: ${risk.detail}`)
    : ["- No high-signal risks detected."]),
  "",
  "### Suggested Tests",
  ...(report.tests.length
    ? report.tests.slice(0, 8).map((test) => `- \`${test.command ?? test.path}\``)
    : ["- Run the repository's normal test suite."])
];

process.stdout.write(`${lines.join("\n")}\n`);
