#!/usr/bin/env node
import fs from "node:fs";
import { renderPrComment } from "../dist/report.js";

const path = process.argv[2] ?? ".codegraph-impact/impact.json";
const report = JSON.parse(fs.readFileSync(path, "utf8"));

process.stdout.write(`${renderPrComment(report)}\n`);
