#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = process.cwd();
const REVIEW_START = "<!-- agent-review:start -->";
const REVIEW_END = "<!-- agent-review:end -->";
const PROVIDER = readArg("--provider") || "codex";

let input = {};
try {
  const raw = fs.readFileSync(0, "utf8").trim();
  input = raw ? JSON.parse(raw) : {};
} catch (_err) {
  input = {};
}

const pending = findSpecsNeedingIsolatedReview();

if (pending.length === 0) {
  process.exit(0);
}

const message = [
  "Specification review required.",
  "",
  "One or more specs need a real isolated subagent review. Do not write the review notes from the same agent that created or edited the spec.",
  "",
  "Required action:",
  "1. Spawn/use the dedicated isolated spec-reviewer subagent.",
  "2. The subagent must read the changed spec, other specs, manifest, docs and code when needed.",
  "3. The subagent must append or replace the final agent-review block in each target spec.",
  "4. The review block must include reviewer: isolated-subagent, review_trigger and reviewed_at metadata.",
  "",
  "Specs needing review:",
  ...pending.map((file) => `- ${file}`),
  "",
  `Hook event: ${input.hook_event_name || "unknown"}`,
].join("\n");

if (PROVIDER === "claude") {
  console.log(JSON.stringify({ additionalContext: message }));
  process.exit(0);
}

console.log(JSON.stringify({
  decision: "block",
  reason: message,
  hookSpecificOutput: {
    hookEventName: input.hook_event_name || "Stop",
    additionalContext: message,
  },
}));

function findSpecsNeedingIsolatedReview() {
  const specsDir = path.join(ROOT, "specs", "draft");
  if (!fs.existsSync(specsDir)) return [];

  return listFiles(specsDir)
    .filter((file) => /^(SPEC|CR)-.*\.md$/.test(path.basename(file)))
    .filter((file) => {
      const text = fs.readFileSync(file, "utf8");
      const status = readFrontmatterValue(text, "status");
      if (status !== "Draft" && status !== "Review") return false;

      const hasReview = text.includes(REVIEW_START) && text.includes(REVIEW_END);
      if (!hasReview) return true;

      const block = extractBetween(text, REVIEW_START, REVIEW_END);
      if (!block.includes("reviewer: isolated-subagent")) return true;
      if (!readReviewField(block, "review_trigger")) return true;
      if (!readReviewField(block, "reviewed_at")) return true;
      if (!text.trimEnd().endsWith(REVIEW_END)) return true;

      const reviewedHash = readReviewField(block, "reviewed_content_sha256");
      if (!reviewedHash) return true;

      return reviewedHash !== hashReviewableContent(text);
    })
    .map((file) => path.relative(ROOT, file).split(path.sep).join("/"));
}

function listFiles(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) => {
      const fullPath = path.join(dir, entry.name);
      return entry.isDirectory() ? listFiles(fullPath) : [fullPath];
    });
}

function readFrontmatterValue(text, key) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;
  const line = match[1]
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}:`));
  if (!line) return null;
  return line.slice(line.indexOf(":") + 1).trim().replace(/^['"]|['"]$/g, "");
}

function extractBetween(text, start, end) {
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return "";
  return text.slice(startIndex + start.length, endIndex);
}

function readReviewField(block, key) {
  const line = block
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith(`${key}:`));
  if (!line) return null;
  return line.slice(line.indexOf(":") + 1).trim();
}

function hashReviewableContent(text) {
  return crypto
    .createHash("sha256")
    .update(stripReviewBlock(text).trimEnd())
    .digest("hex");
}

function stripReviewBlock(text) {
  const startIndex = text.indexOf(REVIEW_START);
  const endIndex = text.indexOf(REVIEW_END);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) return text;
  return `${text.slice(0, startIndex)}${text.slice(endIndex + REVIEW_END.length)}`;
}

function readArg(name) {
  const index = process.argv.indexOf(name);
  if (index !== -1) return process.argv[index + 1];
  const inline = process.argv.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : null;
}
