#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const ROOT = path.resolve(__dirname, "..");

const EXCLUDED_DIRS = new Set([".git", "node_modules"]);
const EXCLUDED_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const COPIED_ROOT_ENTRIES = new Set([
  ".agents",
  ".claude",
  ".codex",
  "AGENTS.md",
  "README.md",
  "changelogs",
  "docs",
  "hooks",
  "package.json",
  "plans",
  "project-knowledge",
  "scripts",
  "specs",
  "templates",
]);

main();

function main() {
  const { projectName, targetParent } = readArgs();
  const slug = slugify(projectName);
  const targetDir = path.join(targetParent, slug);

  if (fs.existsSync(targetDir)) {
    fail(`Target directory already exists: ${targetDir}`);
  }

  validateTargetOutsideTemplate(targetParent, targetDir);
  assertNoSymlinkedTemplateArtifacts();

  copyTemplate(targetDir);
  resetGeneratedProject(targetDir, projectName, slug);
  const validationResult = runCommand(targetDir, "npm", ["run", "validate"]);
  if (!validationResult.ok) {
    console.log(`Created client project: ${targetDir}`);
    console.log(`Raw knowledge: ${path.join(targetDir, "project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md")}`);
    console.log("Validation: failed");
    printCommandFailure("npm run validate", validationResult);
    console.log("Git was not initialized because the generated project did not pass validation.");
    process.exit(1);
  }

  const gitResult = initializeGit(targetDir);

  console.log(`Created client project: ${targetDir}`);
  console.log(`Raw knowledge: ${path.join(targetDir, "project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md")}`);
  console.log("Validation: passed");
  console.log(`Git setup: ${gitResult.ok ? "ready" : "needs manual follow-up"}`);

  if (!gitResult.ok) {
    console.log("Manual follow-up:");
    for (const note of gitResult.notes) console.log(`- ${note}`);
    console.log("First push readiness: blocked until manual follow-up is resolved.");
  }

  console.log("Next steps:");
  console.log(`1. cd ${targetDir}`);
  console.log("2. Fill project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md");
  console.log("3. Create the first client Global Spec from the raw knowledge");
  console.log("4. Add a Git remote when ready:");
  console.log("   git remote add origin <remote-url>");
  console.log("5. Complete templates/client-initialization-checklist.md, then push main and dev:");
  console.log("   git push -u origin main");
  console.log("   git push -u origin dev");

  if (!gitResult.ok) {
    process.exitCode = 1;
  }
}

function readArgs() {
  const [, , rawName, rawTargetParent] = process.argv;

  if (!rawName || rawName === "--help" || rawName === "-h") {
    console.log("Usage: npm run client:init -- \"Client Project Name\" [target-parent-directory]");
    process.exit(rawName ? 0 : 1);
  }

  const projectName = normalizeProjectName(rawName);

  const targetParent = rawTargetParent
    ? path.resolve(rawTargetParent)
    : path.resolve(ROOT, "..");

  return { projectName, targetParent };
}

function normalizeProjectName(value) {
  const projectName = value.trim().replace(/\s+/g, " ");

  if (!projectName) fail("Project name cannot be empty.");
  if (/[\x00-\x1f\x7f]/.test(value)) fail("Project name cannot contain control characters or multiline content.");
  if (projectName.length > 80) fail("Project name must be 80 characters or fewer.");

  return projectName;
}

function validateTargetOutsideTemplate(targetParent, targetDir) {
  const lexicalRelative = path.relative(ROOT, targetDir);
  const isLexicallyInsideTemplate =
    lexicalRelative === "" || (!lexicalRelative.startsWith("..") && !path.isAbsolute(lexicalRelative));

  if (isLexicallyInsideTemplate) {
    fail("Target directory must be outside the template repository tree.");
  }

  const realRoot = fs.realpathSync(ROOT);
  const realTarget = resolvePathThroughExistingAncestor(targetDir);
  const realRelative = path.relative(realRoot, realTarget);
  const isReallyInsideTemplate =
    realRelative === "" || (!realRelative.startsWith("..") && !path.isAbsolute(realRelative));

  if (isReallyInsideTemplate) {
    fail("Resolved target directory must be outside the template repository tree.");
  }
}

function resolvePathThroughExistingAncestor(absolutePath) {
  const missingParts = [];
  let current = absolutePath;

  while (!fs.existsSync(current)) {
    const parent = path.dirname(current);
    if (parent === current) {
      fail(`No existing parent directory found for target path: ${absolutePath}`);
    }
    missingParts.unshift(path.basename(current));
    current = parent;
  }

  return path.join(fs.realpathSync(current), ...missingParts);
}

function copyTemplate(targetDir) {
  fs.mkdirSync(targetDir, { recursive: true });

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!shouldCopyRootEntry(entry.name)) continue;
    copyRecursive(path.join(ROOT, entry.name), path.join(targetDir, entry.name));
  }
}

function assertNoSymlinkedTemplateArtifacts() {
  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (!shouldCopyRootEntry(entry.name)) continue;
    assertNoSymlinkRecursive(path.join(ROOT, entry.name));
  }
}

function assertNoSymlinkRecursive(source) {
  const name = path.basename(source);
  if (EXCLUDED_DIRS.has(name) || EXCLUDED_FILES.has(name)) return;

  const stat = fs.lstatSync(source);

  if (stat.isSymbolicLink()) {
    fail(`Symlinked template artifact is not supported: ${path.relative(ROOT, source)}`);
  }

  if (!stat.isDirectory()) return;

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const child = path.join(source, entry.name);
    assertNoSymlinkRecursive(child);
  }
}

function shouldCopyRootEntry(name) {
  return COPIED_ROOT_ENTRIES.has(name) && !EXCLUDED_DIRS.has(name) && !EXCLUDED_FILES.has(name);
}

function copyRecursive(source, target) {
  const name = path.basename(source);
  if (EXCLUDED_DIRS.has(name) || EXCLUDED_FILES.has(name)) return;

  const stat = fs.lstatSync(source);

  if (stat.isSymbolicLink()) {
    fail(`Symlinked template artifact is not supported: ${path.relative(ROOT, source)}`);
  }

  if (stat.isDirectory()) {
    fs.mkdirSync(target, { recursive: true });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      copyRecursive(path.join(source, entry.name), path.join(target, entry.name));
    }
    return;
  }

  fs.copyFileSync(source, target);
}

function resetGeneratedProject(targetDir, projectName, slug) {
  writePackageJson(targetDir, projectName, slug);
  writeReadme(targetDir, projectName);
  resetSpecs(targetDir);
  resetPlans(targetDir);
  resetRawKnowledge(targetDir, projectName);
  resetChangelogs(targetDir);
}

function writePackageJson(targetDir, projectName, slug) {
  const file = path.join(targetDir, "package.json");
  const json = JSON.parse(fs.readFileSync(file, "utf8"));
  json.name = slug;
  json.description = `${projectName} specification-driven project.`;
  fs.writeFileSync(file, `${JSON.stringify(json, null, 2)}\n`);
}

function writeReadme(targetDir, projectName) {
  const content = `# ${projectName}

This repository was initialized from the Specification-Driven Development template.

## First Step

Fill the active raw knowledge file:

\`\`\`text
project-knowledge/raw/RAW_PROJECT_KNOWLEDGE_CLIENT.md
\`\`\`

Then create the first client Global Spec from that raw knowledge.

## Commands

\`\`\`bash
npm run validate
npm run validate:pre-commit
npm run validate:pre-push
npm run validate:ci
npm run review:hook
npm run hooks:install
\`\`\`

## Initialization Checklist

Use this checklist before the first push:

\`\`\`text
templates/client-initialization-checklist.md
\`\`\`

## Workflow

- \`main\` is production.
- \`dev\` is shared development.
- The generated repository starts with no accepted specs.
- SDD workflow mechanics come from copied operational files: scripts, hooks, templates, docs, agent instructions and package commands.
- Product implementation work must wait for accepted client specs or use a controlled bootstrap \`OFFSPEC\` exception limited to initialization or first-spec preparation.

## First Push

Run these only after validation passes, hook installation is ready or an approved manual validation workflow is recorded, and the initialization checklist is complete.

\`\`\`bash
git remote add origin <remote-url>
git push -u origin main
git push -u origin dev
\`\`\`
`;

  fs.writeFileSync(path.join(targetDir, "README.md"), content);
}

function resetSpecs(targetDir) {
  const specsDir = path.join(targetDir, "specs");
  const acceptedDir = path.join(specsDir, "accepted");
  const draftDir = path.join(specsDir, "draft");

  fs.mkdirSync(acceptedDir, { recursive: true });
  fs.mkdirSync(draftDir, { recursive: true });

  removeAllExcept(specsDir, new Set(["README.md", "accepted", "draft"]));
  removeAllExcept(acceptedDir, new Set(["README.md", "manifest.json"]));
  removeAllExcept(draftDir, new Set(["README.md"]));

  const manifest = {
    schema_version: "1.0.0",
    specs: [],
  };
  fs.writeFileSync(path.join(acceptedDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
}

function removeAllExcept(dir, keepNames) {
  if (!fs.existsSync(dir)) return;

  for (const name of fs.readdirSync(dir)) {
    if (keepNames.has(name)) continue;
    fs.rmSync(path.join(dir, name), { recursive: true, force: true });
  }
}

function resetPlans(targetDir) {
  for (const dir of ["plans/active", "plans/done"]) {
    const fullDir = path.join(targetDir, dir);
    fs.mkdirSync(fullDir, { recursive: true });
    for (const file of fs.readdirSync(fullDir)) {
      if (file !== ".gitkeep") fs.rmSync(path.join(fullDir, file), { recursive: true, force: true });
    }
    fs.writeFileSync(path.join(fullDir, ".gitkeep"), "");
  }
}

function resetRawKnowledge(targetDir, projectName) {
  const rawDir = path.join(targetDir, "project-knowledge", "raw");
  fs.mkdirSync(rawDir, { recursive: true });
  for (const file of fs.readdirSync(rawDir)) {
    fs.rmSync(path.join(rawDir, file), { recursive: true, force: true });
  }

  const content = `# Raw project knowledge - ${projectName}

This temporary document contains everything known about the client project before the specifications are complete.

It is not an accepted specification and must not be used as implementation authority after bootstrap mode ends.

## Client Brief

## Business Context

## Users

## Geography

## Ideas

## Decisions

## Hypotheses

## Open Questions

## Notes To Not Forget
`;

  fs.writeFileSync(path.join(rawDir, "RAW_PROJECT_KNOWLEDGE_CLIENT.md"), content);
}

function resetChangelogs(targetDir) {
  const changelogDir = path.join(targetDir, "changelogs");
  if (!fs.existsSync(changelogDir)) return;

  for (const file of fs.readdirSync(changelogDir)) {
    if (!file.endsWith(".md") || file === "README.md") continue;
    const fullPath = path.join(changelogDir, file);
    const source = fs.readFileSync(fullPath, "utf8");
    fs.writeFileSync(fullPath, preserveChangelogIntro(source));
  }
}

function preserveChangelogIntro(source) {
  const lines = source.split(/\r?\n/);
  const entryIndex = lines.findIndex((line) => /^## \d{4}-\d{2}-\d{2} - /.test(line));
  const intro = entryIndex === -1 ? lines : lines.slice(0, entryIndex);
  return `${intro.join("\n").trimEnd()}\n`;
}

function initializeGit(targetDir) {
  const notes = [];
  const gitInit = runCommand(targetDir, "git", ["init", "-b", "main"]);

  if (!gitInit.ok) {
    const fallback = runCommand(targetDir, "git", ["init"]);
    if (!fallback.ok) {
      return { ok: false, notes: ["Git is unavailable or failed to initialize."] };
    }
  }

  const main = ensureMainBranch(targetDir);
  if (!main.ok) return { ok: false, notes: main.notes };

  const hookInstall = runCommand(targetDir, "npm", ["run", "hooks:install"]);
  if (!hookInstall.ok) {
    notes.push("Git hook installation failed. Run npm run hooks:install after resolving the reported issue.");
    notes.push(commandFailureSummary("npm run hooks:install", hookInstall));
    notes.push("If an approved manual validation workflow is used before a client plan exists, record that approval in the active raw knowledge and migrate it into the first governing spec or plan.");
  }

  runCommand(targetDir, "git", ["add", "."]);

  const commit = runCommand(targetDir, "git", ["commit", "-m", "chore: initialize client project from SDD template"]);
  if (!commit.ok) {
    notes.push("Initial commit was not created. Configure Git identity if needed, then commit the generated files.");
    notes.push(commandFailureSummary("git commit", commit));
    notes.push("Create dev after the first commit with: git switch -c dev");
    return { ok: false, notes };
  }

  const dev = runCommand(targetDir, "git", ["switch", "-c", "dev"]);
  if (!dev.ok) {
    notes.push("Initial commit was created, but dev branch creation failed. Run: git switch -c dev");
    return { ok: false, notes };
  }

  return { ok: notes.length === 0, notes };
}

function ensureMainBranch(targetDir) {
  const notes = [];
  const rename = runCommand(targetDir, "git", ["branch", "-M", "main"]);

  if (!rename.ok) {
    notes.push("Git was initialized, but main branch creation or rename failed. Run: git branch -M main");
    notes.push(commandFailureSummary("git branch -M main", rename));
    return { ok: false, notes };
  }

  const current = runCommand(targetDir, "git", ["symbolic-ref", "--short", "HEAD"]);
  if (!current.ok || current.stdout.trim() !== "main") {
    notes.push("Git was initialized, but HEAD is not on main. Run: git switch main or git branch -M main before the initial commit.");
    if (!current.ok) notes.push(commandFailureSummary("git symbolic-ref --short HEAD", current));
    return { ok: false, notes };
  }

  return { ok: true, notes };
}

function runCommand(cwd, command, args) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    stdio: "pipe",
  });

  return {
    ok: result.status === 0,
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
  };
}

function printCommandFailure(label, result) {
  console.log(`${label} failed with exit code ${result.status}.`);
  if (result.stdout.trim()) {
    console.log("stdout:");
    console.log(result.stdout.trim());
  }
  if (result.stderr.trim()) {
    console.log("stderr:");
    console.log(result.stderr.trim());
  }
}

function commandFailureSummary(label, result) {
  const details = [result.stderr, result.stdout]
    .filter(Boolean)
    .join("\n")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 4)
    .join(" ");
  return details
    ? `${label} failed: ${details}`
    : `${label} failed without output.`;
}

function slugify(value) {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) fail("Project name must contain at least one ASCII letter or number.");
  return slug;
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
