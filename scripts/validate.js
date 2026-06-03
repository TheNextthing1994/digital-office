#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.resolve(__dirname, "..");
const MODE = readMode(process.argv);

const VALID_MODES = new Set(["full", "pre-commit", "pre-push", "ci"]);

const SPEC_TYPES = new Set([
  "GlobalSpec",
  "FeatureSpec",
  "SubFeatureSpec",
  "TechnicalSpec",
  "ChangeRequest",
]);

const SPEC_STATUSES = new Set(["Draft", "Review", "Accepted", "Deprecated"]);

const CHANGE_REQUEST_APPLICATION_STATUSES = new Set([
  "proposed",
  "accepted",
  "applied",
  "rejected",
  "superseded",
]);

const WORK_TYPES = new Set([
  "feature",
  "fix",
  "hotfix",
  "spec",
  "chore",
  "docs",
  "refactor",
  "validation",
]);

const WORK_AREAS = new Set([
  "repository",
  "specs",
  "features",
  "fixes",
  "hotfix",
  "hooks",
  "validation",
  "docs",
  "api",
  "frontend",
  "database",
  "data-structures",
  "migrations",
  "workers",
]);

const GENERIC_WORK_AREAS_WITHOUT_OWN_CHANGELOG = new Set(["features", "fixes", "hotfix"]);

const CHANGELOG_BY_AREA = new Map([
  ["repository", "changelogs/repository.md"],
  ["specs", "changelogs/specs.md"],
  ["docs", "changelogs/docs.md"],
  ["validation", "changelogs/validation.md"],
  ["hooks", "changelogs/hooks.md"],
  ["api", "changelogs/api.md"],
  ["frontend", "changelogs/frontend.md"],
  ["database", "changelogs/database.md"],
  ["data-structures", "changelogs/data-structures.md"],
  ["migrations", "changelogs/migrations.md"],
  ["workers", "changelogs/workers.md"],
]);

const SPEC_ID_PREFIX = {
  GlobalSpec: /^SPEC-GLOBAL-\d{3,}$/,
  FeatureSpec: /^SPEC-FEATURE-\d{3,}$/,
  SubFeatureSpec: /^SPEC-SUBFEATURE-\d{3,}$/,
  TechnicalSpec: /^SPEC-TECH-\d{3,}$/,
  ChangeRequest: /^CR-\d{3,}$/,
};

const REVIEW_START = "<!-- agent-review:start -->";
const REVIEW_END = "<!-- agent-review:end -->";
const RESOLUTION_START = "<!-- review-resolution:start -->";
const RESOLUTION_END = "<!-- review-resolution:end -->";

const DOCUMENT_EXTENSIONS = new Set([".md", ".json"]);
const IGNORED_DOCUMENT_DIRS = new Set([
  ".git",
  "node_modules",
  ".venv",
  "dist",
  "build",
  ".next",
  "coverage",
]);

const NON_ENGLISH_DOCUMENT_PATTERNS = [
  {
    label: "French accented character",
    regex: /[éèêëàâùûçôîïÉÈÊËÀÂÙÛÇÔÎÏ]/,
  },
  {
    label: "French article or determiner",
    regex: /\b(ce|cette|ces|chaque|toutes|tous|une|un|des|les|le|la)\b/i,
  },
  {
    label: "French project wording",
    regex: /\b(nous|vous|doit|doivent|peut|peuvent|etre|avec|dans|pour|sans|avant|apres|lorsque|travail|fichier|dossier|branche|developpeur|relecture)\b/i,
  },
  {
    label: "French project phrase",
    regex: /\b(connaissance brute|specification acceptee|specifications acceptees|questions ouvertes|zones grises|verification humaine|mettre en place|si necessaire)\b/i,
  },
];

const errors = [];
const warnings = [];

main();

function main() {
  validateMode();
  validateDocumentLanguage();
  const manifest = validateManifest();
  const specs = validateSpecs(manifest);
  validatePlans(specs);

  if (warnings.length) {
    for (const warning of warnings) {
      console.warn(`WARN ${warning}`);
    }
  }

  if (errors.length) {
    for (const error of errors) {
      console.error(`ERROR ${error}`);
    }
    console.error(`\nValidation failed in ${MODE} mode with ${errors.length} error(s).`);
    process.exit(1);
  }

  console.log(`Validation passed in ${MODE} mode.`);
}

function validateMode() {
  if (!VALID_MODES.has(MODE)) {
    error(`unknown validation mode ${MODE}. Expected one of: ${Array.from(VALID_MODES).join(", ")}.`);
  }
}

function validateDocumentLanguage() {
  for (const file of listDocumentFiles(ROOT)) {
    const rel = toRel(file);
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);

    for (const rule of NON_ENGLISH_DOCUMENT_PATTERNS) {
      const index = lines.findIndex((line) => rule.regex.test(line));
      if (index !== -1) {
        error(`${rel}:${index + 1} appears to contain non-English document text (${rule.label}). Project documents must be written in English.`);
      }
    }
  }
}

function validateManifest() {
  const manifestPath = path.join(ROOT, "specs", "accepted", "manifest.json");
  if (!fs.existsSync(manifestPath)) {
    error("specs/accepted/manifest.json is missing.");
    return { specs: [], byId: new Map() };
  }

  let json;
  try {
    json = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  } catch (err) {
    error(`specs/accepted/manifest.json is not valid JSON: ${err.message}`);
    return { specs: [], byId: new Map() };
  }

  if (json.schema_version !== "1.0.0") {
    error("specs/accepted/manifest.json must have schema_version \"1.0.0\".");
  }

  if (!Array.isArray(json.specs)) {
    error("specs/accepted/manifest.json must contain a specs array.");
    return { specs: [], byId: new Map() };
  }

  const byId = new Map();
  for (const entry of json.specs) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      error("manifest specs entries must be objects.");
      continue;
    }

    for (const key of ["id", "path", "type", "status", "parent", "depends_on", "related_specs"]) {
      if (!(key in entry)) {
        error(`manifest entry ${entry.id || "<unknown>"} is missing ${key}.`);
      }
    }

    if (entry.id) {
      if (byId.has(entry.id)) {
        error(`manifest contains duplicate spec id ${entry.id}.`);
      }
      byId.set(entry.id, entry);
    }

    if (entry.status !== "Accepted") {
      error(`manifest entry ${entry.id || "<unknown>"} must have status Accepted.`);
    }

    if (typeof entry.path === "string" && !entry.path.startsWith("specs/accepted/")) {
      error(`manifest entry ${entry.id || "<unknown>"} must point inside specs/accepted/.`);
    }

    if (!SPEC_TYPES.has(entry.type)) {
      error(`manifest entry ${entry.id || "<unknown>"} has invalid type ${entry.type}.`);
    }

    if (!Array.isArray(entry.depends_on)) {
      error(`manifest entry ${entry.id || "<unknown>"} depends_on must be an array.`);
    } else {
      validateIdArray(`manifest entry ${entry.id || "<unknown>"}`, "depends_on", entry.depends_on);
    }

    if (!Array.isArray(entry.related_specs)) {
      error(`manifest entry ${entry.id || "<unknown>"} related_specs must be an array.`);
    } else {
      validateIdArray(`manifest entry ${entry.id || "<unknown>"}`, "related_specs", entry.related_specs);
    }

    if (typeof entry.path === "string") {
      const target = path.join(ROOT, entry.path);
      if (!fs.existsSync(target)) {
        error(`manifest entry ${entry.id || "<unknown>"} points to missing file ${entry.path}.`);
      }
    }
  }

  for (const entry of byId.values()) {
    validateRelationIds("manifest", entry.id, "parent", normalizeList(entry.parent), byId);
    validateRelationIds("manifest", entry.id, "depends_on", entry.depends_on || [], byId);
    validateRelationIds("manifest", entry.id, "related_specs", entry.related_specs || [], byId);
  }

  return { specs: json.specs, byId };
}

function validateSpecs(manifest) {
  const specDir = path.join(ROOT, "specs");
  const files = listFiles(specDir)
    .filter((file) => file.endsWith(".md"))
    .filter((file) => path.basename(file).toLowerCase() !== "readme.md")
    .sort((a, b) => toRel(a).localeCompare(toRel(b)));

  const specs = [];
  const acceptedSpecs = [];
  const byId = new Map();

  for (const file of files) {
    const rel = toRel(file);
    const text = fs.readFileSync(file, "utf8");
    const isAcceptedPath = rel.startsWith("specs/accepted/");
    const isDraftPath = rel.startsWith("specs/draft/");

    if (!isAcceptedPath && !isDraftPath) {
      error(`${rel} must live in specs/draft/ or specs/accepted/.`);
      continue;
    }

    const parsed = parseFrontmatter(text, rel, { strict: isAcceptedPath });
    if (!parsed) {
      continue;
    }

    const meta = parsed.meta;
    const spec = { file, rel, text, meta, isAcceptedPath, isDraftPath };
    specs.push(spec);

    if (isAcceptedPath || meta.status === "Accepted") {
      validateSpecMeta(rel, meta);
    }

    if (isAcceptedPath) {
      acceptedSpecs.push(spec);
    }

    if (meta.status === "Accepted" && !isAcceptedPath) {
      error(`${rel} has status Accepted but is not inside specs/accepted/.`);
    }

    if (isAcceptedPath && meta.status !== "Accepted") {
      error(`${rel} is inside specs/accepted/ but status is ${meta.status}.`);
    }

    if (meta.id) {
      if (byId.has(meta.id)) {
        error(`duplicate spec id ${meta.id} in ${rel} and ${byId.get(meta.id).rel}. Spec IDs must be unique across Draft and Accepted specs.`);
      } else {
        byId.set(meta.id, { file, rel, text, meta });
      }
    }
  }

  for (const spec of acceptedSpecs) {
    validateSpecRelations(spec, manifest.byId, manifest);
    validateSpecReviewBlocks(spec);
    validateSpecManifestAgreement(spec, manifest);
  }

  for (const spec of specs.filter((candidate) => candidate.isDraftPath)) {
    validateDraftSpecReviewBlocks(spec);
  }

  for (const entry of manifest.byId.values()) {
    const spec = byId.get(entry.id);
    if (!spec) {
      error(`manifest references ${entry.id}, but no matching accepted spec file was parsed.`);
      continue;
    }
    if (entry.path !== spec.rel) {
      error(`manifest path for ${entry.id} is ${entry.path}, but actual file is ${spec.rel}.`);
    }
    if (entry.type !== spec.meta.type) {
      error(`manifest type for ${entry.id} does not match ${spec.rel}.`);
    }
    if (entry.status !== spec.meta.status) {
      error(`manifest status for ${entry.id} does not match ${spec.rel}.`);
    }
  }

  return { specs, acceptedSpecs, byId, manifest };
}

function validateSpecMeta(rel, meta) {
  for (const key of ["id", "type", "status", "title", "parent", "depends_on", "related_specs", "work_area"]) {
    if (!(key in meta)) {
      error(`${rel} is missing frontmatter key ${key}.`);
    }
  }

  if (!SPEC_TYPES.has(meta.type)) {
    error(`${rel} has invalid spec type ${meta.type}.`);
  }

  if (!SPEC_STATUSES.has(meta.status)) {
    error(`${rel} has invalid status ${meta.status}.`);
  }

  if (meta.type && SPEC_ID_PREFIX[meta.type] && !SPEC_ID_PREFIX[meta.type].test(String(meta.id))) {
    error(`${rel} id ${meta.id} does not match type ${meta.type}.`);
  }

  if (!Array.isArray(meta.depends_on)) {
    error(`${rel} depends_on must be an array.`);
  } else {
    validateIdArray(rel, "depends_on", meta.depends_on);
  }

  if (!Array.isArray(meta.related_specs)) {
    error(`${rel} related_specs must be an array.`);
  } else {
    validateIdArray(rel, "related_specs", meta.related_specs);
  }

  if (!WORK_AREAS.has(meta.work_area)) {
    error(`${rel} work_area ${meta.work_area} is not allowed.`);
  }

  if (meta.type === "ChangeRequest") {
    validateChangeRequestMeta(rel, meta, null);
  }
}

function validateSpecRelations(spec, _byId, manifest) {
  const id = spec.meta.id || spec.rel;
  const known = manifest.byId;

  validateRelationIds("spec", id, "parent", normalizeList(spec.meta.parent), known);
  validateRelationIds("spec", id, "depends_on", spec.meta.depends_on || [], known);
  validateRelationIds("spec", id, "related_specs", spec.meta.related_specs || [], known);

  if (spec.meta.status === "Accepted" && spec.meta.type === "TechnicalSpec") {
    const relationIds = [
      ...(Array.isArray(spec.meta.depends_on) ? spec.meta.depends_on : []),
      ...(Array.isArray(spec.meta.related_specs) ? spec.meta.related_specs : []),
    ];
    const hasFunctionalJustification = relationIds.some((targetId) => {
      const entry = manifest.byId.get(targetId);
      return entry && ["FeatureSpec", "SubFeatureSpec"].includes(entry.type);
    });

    if (!hasFunctionalJustification) {
      error(`${spec.rel} is an accepted TechnicalSpec and must depend on or relate to at least one accepted FeatureSpec or SubFeatureSpec.`);
    }
  }

  if (spec.meta.status === "Accepted" && spec.meta.type === "ChangeRequest") {
    validateChangeRequestMeta(spec.rel, spec.meta, manifest);
  }
}

function validateChangeRequestMeta(rel, meta, manifest) {
  if (!("target_spec" in meta)) {
    error(`${rel} ChangeRequest is missing frontmatter key target_spec.`);
    return;
  }

  if (typeof meta.target_spec !== "string" || !SPEC_ID_PREFIX.GlobalSpec.test(meta.target_spec) && !SPEC_ID_PREFIX.FeatureSpec.test(meta.target_spec) && !SPEC_ID_PREFIX.SubFeatureSpec.test(meta.target_spec) && !SPEC_ID_PREFIX.TechnicalSpec.test(meta.target_spec)) {
    error(`${rel} target_spec must reference a SPEC-* id.`);
  }

  if (!("application_status" in meta)) {
    error(`${rel} ChangeRequest is missing frontmatter key application_status.`);
  } else if (!CHANGE_REQUEST_APPLICATION_STATUSES.has(meta.application_status)) {
    error(`${rel} application_status ${meta.application_status} is not allowed.`);
  }

  if (manifest && meta.target_spec) {
    const target = manifest.byId.get(meta.target_spec);
    if (!target) {
      error(`${rel} target_spec ${meta.target_spec} is not an accepted manifest entry.`);
    } else if (target.type === "ChangeRequest") {
      error(`${rel} target_spec must not point to another ChangeRequest.`);
    }
  }
}

function validateSpecReviewBlocks(spec) {
  const hasReviewStart = spec.text.includes(REVIEW_START);
  const hasReviewEnd = spec.text.includes(REVIEW_END);
  const hasResolutionStart = spec.text.includes(RESOLUTION_START);
  const hasResolutionEnd = spec.text.includes(RESOLUTION_END);

  if (hasReviewStart || hasReviewEnd) {
    error(`${spec.rel} still contains an unresolved agent review block.`);
  }

  if (hasResolutionStart !== hasResolutionEnd) {
    error(`${spec.rel} has an incomplete review resolution block.`);
  }

  if (spec.meta.status === "Accepted") {
    if (!hasResolutionStart) {
      error(`${spec.rel} is Accepted and must contain a review resolution block.`);
    } else {
      const block = extractBetween(spec.text, RESOLUTION_START, RESOLUTION_END);
      for (const required of [
        "agent_review_read: true",
        "agent_review_resolved_or_explicitly_ignored: true",
        "unresolved_agent_review_blocks_removed: true",
        "human_acceptance_confirmed: true",
      ]) {
        if (!block.includes(required)) {
          error(`${spec.rel} review resolution block is missing ${required}.`);
        }
      }
    }
  }
}

function validateDraftSpecReviewBlocks(spec) {
  const hasReviewStart = spec.text.includes(REVIEW_START);
  const hasReviewEnd = spec.text.includes(REVIEW_END);

  if (hasReviewStart !== hasReviewEnd) {
    warn(`${spec.rel} has an incomplete agent review block. Draft specs are not blocked, but this should be fixed before acceptance.`);
    return;
  }

  if (!hasReviewStart) {
    warn(`${spec.rel} has no isolated agent review block yet.`);
    return;
  }

  if (!spec.text.trimEnd().endsWith(REVIEW_END)) {
    warn(`${spec.rel} agent review block should be the final content before acceptance.`);
  }

  const block = extractBetween(spec.text, REVIEW_START, REVIEW_END);
  for (const required of ["reviewer: isolated-subagent", "review_trigger:", "reviewed_at:"]) {
    if (!block.includes(required)) {
      warn(`${spec.rel} agent review block is missing isolated-review metadata: ${required}`);
    }
  }

  const reviewedHash = readReviewField(block, "reviewed_content_sha256");
  if (!reviewedHash) {
    warn(`${spec.rel} agent review block is missing reviewed_content_sha256; review staleness cannot be checked.`);
    return;
  }

  const currentHash = hashReviewableContent(spec.text);
  if (reviewedHash !== currentHash) {
    warn(`${spec.rel} changed after its isolated agent review; rerun review for this spec only.`);
  }
}

function validateSpecManifestAgreement(spec, manifest) {
  const manifestEntry = manifest.byId.get(spec.meta.id);

  if (spec.meta.status === "Accepted" && !manifestEntry) {
    error(`${spec.rel} is Accepted but is not declared in specs/accepted/manifest.json.`);
  }

  if (manifestEntry && spec.meta.status !== "Accepted") {
    error(`${spec.rel} is declared in manifest but has status ${spec.meta.status}.`);
  }

  if (!manifestEntry) return;

  if (normalizeParent(manifestEntry.parent) !== normalizeParent(spec.meta.parent)) {
    error(`${spec.rel} parent does not match specs/accepted/manifest.json.`);
  }

  if (
    Array.isArray(manifestEntry.depends_on) &&
    Array.isArray(spec.meta.depends_on) &&
    !sameIdSet(manifestEntry.depends_on, spec.meta.depends_on)
  ) {
    error(`${spec.rel} depends_on does not match specs/accepted/manifest.json.`);
  }

  if (
    Array.isArray(manifestEntry.related_specs) &&
    Array.isArray(spec.meta.related_specs) &&
    !sameIdSet(manifestEntry.related_specs, spec.meta.related_specs)
  ) {
    error(`${spec.rel} related_specs does not match specs/accepted/manifest.json.`);
  }
}

function validatePlans(specs) {
  const activeFiles = listMarkdown(path.join(ROOT, "plans", "active"));
  const doneFiles = listMarkdown(path.join(ROOT, "plans", "done"));
  const activePlans = [];

  for (const file of activeFiles) {
    const plan = validatePlan(file, specs, "active");
    if (plan) activePlans.push(plan);
  }

  for (const file of doneFiles) {
    validatePlan(file, specs, "done");
  }

  if (activePlans.length > 1) {
    error(`only one active plan is allowed, found ${activePlans.length}.`);
  }

  if (["pre-push", "ci"].includes(MODE) && activePlans.length > 0) {
    error(`${MODE} is blocked because a plan is still active.`);
  }
}

function validatePlan(file, specs, folderKind) {
  const rel = toRel(file);
  const text = fs.readFileSync(file, "utf8");
  const parsed = parseFrontmatter(text, rel);
  if (!parsed) {
    return null;
  }

  const meta = parsed.meta;
  for (const key of [
    "id",
    "status",
    "work_type",
    "work_area",
    "impacted_areas",
    "branch",
    "spec_refs",
    "has_offspec",
    "changelog_refs",
    "human_verification_required",
  ]) {
    if (!(key in meta)) {
      error(`${rel} is missing frontmatter key ${key}.`);
    }
  }

  if (!/^PLAN-\d{4,}$/.test(String(meta.id))) {
    error(`${rel} id ${meta.id} must match PLAN-0001 style.`);
  }

  if (!["Active", "Done"].includes(meta.status)) {
    error(`${rel} status must be Active or Done.`);
  }

  if (folderKind === "active" && meta.status !== "Active") {
    error(`${rel} is in plans/active but status is ${meta.status}.`);
  }

  if (folderKind === "done" && meta.status !== "Done") {
    error(`${rel} is in plans/done but status is ${meta.status}.`);
  }

  if (!WORK_TYPES.has(meta.work_type)) {
    error(`${rel} work_type ${meta.work_type} is not allowed.`);
  }

  if (!WORK_AREAS.has(meta.work_area)) {
    error(`${rel} work_area ${meta.work_area} is not allowed.`);
  }

  validatePlanImpactedAreas(rel, meta);

  if (!Array.isArray(meta.spec_refs)) {
    error(`${rel} spec_refs must be an array.`);
  } else {
    for (const specId of meta.spec_refs) {
      if (!specs.manifest.byId.has(specId)) {
        error(`${rel} spec_refs contains unknown accepted spec ${specId}. Use OFFSPEC for work not covered by an accepted spec.`);
      }
    }
  }

  if (!Array.isArray(meta.changelog_refs)) {
    error(`${rel} changelog_refs must be an array.`);
  }

  if (typeof meta.has_offspec !== "boolean") {
    error(`${rel} has_offspec must be true or false.`);
  }

  if (meta.human_verification_required !== true) {
    error(`${rel} human_verification_required must be true.`);
  }

  validatePlanBranch(rel, meta);
  validatePlanWorkItems(rel, text, specs, meta);
  validatePlanHumanVerification(rel, text);
  validateDonePlanChangelogs(rel, meta);

  return { rel, meta };
}

function validatePlanImpactedAreas(rel, meta) {
  if (!Array.isArray(meta.impacted_areas)) {
    error(`${rel} impacted_areas must be an array.`);
    return;
  }

  const seen = new Set();
  for (const area of meta.impacted_areas) {
    if (typeof area !== "string") {
      error(`${rel} impacted_areas must contain only strings.`);
      continue;
    }
    if (!WORK_AREAS.has(area)) {
      error(`${rel} impacted_areas contains unsupported area ${area}.`);
      continue;
    }
    if (GENERIC_WORK_AREAS_WITHOUT_OWN_CHANGELOG.has(area)) {
      error(`${rel} impacted_areas contains generic area ${area}; use a concrete technical area instead.`);
      continue;
    }
    if (seen.has(area)) {
      error(`${rel} impacted_areas contains duplicate area ${area}.`);
      continue;
    }
    seen.add(area);
    if (area === meta.work_area) {
      error(`${rel} impacted_areas must not repeat primary work_area ${area}.`);
    }
  }

  const hasConcreteChangelogArea = [meta.work_area, ...meta.impacted_areas]
    .some((area) => CHANGELOG_BY_AREA.has(area));

  if (
    GENERIC_WORK_AREAS_WITHOUT_OWN_CHANGELOG.has(meta.work_area) &&
    !hasConcreteChangelogArea
  ) {
    error(`${rel} uses generic work_area ${meta.work_area} and must declare at least one concrete impacted area with a changelog.`);
  }
}

function validatePlanBranch(rel, meta) {
  if (typeof meta.branch !== "string" || !meta.branch) {
    error(`${rel} branch must be a non-empty string.`);
    return;
  }

  const planNumber = String(meta.id || "").replace("PLAN-", "").toLowerCase();
  if (planNumber && !meta.branch.includes(planNumber)) {
    error(`${rel} branch must include plan number ${planNumber}.`);
  }

  if (meta.work_type && !meta.branch.includes(meta.work_type)) {
    error(`${rel} branch must include work type ${meta.work_type}.`);
  }

  if (meta.work_area && !meta.branch.includes(meta.work_area)) {
    error(`${rel} branch must include work area ${meta.work_area}.`);
  }
}

function validatePlanWorkItems(rel, text, specs, meta) {
  const section = extractMarkdownSection(text, "Work Items");
  if (!section.trim()) {
    error(`${rel} must contain a Work Items section.`);
    return;
  }

  const itemLines = section
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\[[ xX]\]\s+/.test(line));

  if (itemLines.length === 0) {
    error(`${rel} must contain at least one work item checkbox.`);
  }

  const offspecIds = new Set();

  for (const line of itemLines) {
    const specMatch = line.match(/\[SPEC:\s*([A-Z0-9-]+)\]/);
    const offspecMatch = line.match(/\[OFFSPEC:\s*(OFFSPEC-\d{3,})\]/i);

    if (!specMatch && !offspecMatch) {
      error(`${rel} work item is missing [SPEC: ...] or [OFFSPEC: OFFSPEC-001]: ${line.trim()}`);
      continue;
    }

    if (specMatch) {
      const specId = specMatch[1];
      if (!specs.manifest.byId.has(specId)) {
        error(`${rel} work item references non-accepted or unknown spec ${specId}. Use OFFSPEC for work not covered by an accepted spec.`);
      }
    }

    if (offspecMatch) {
      offspecIds.add(offspecMatch[1].toUpperCase());
    }
  }

  if (offspecIds.size > 0 && meta.has_offspec !== true) {
    error(`${rel} contains OFFSPEC work items but has_offspec is not true.`);
  }

  if (offspecIds.size === 0 && meta.has_offspec === true) {
    error(`${rel} has_offspec is true but no OFFSPEC work item was found.`);
  }

  validateOffspecExceptions(rel, text, offspecIds);
}

function validateOffspecExceptions(rel, text, offspecIds) {
  if (offspecIds.size === 0) return;

  const section = extractMarkdownSection(text, "Offspec Exceptions");
  if (!section.trim()) {
    error(`${rel} contains OFFSPEC work items but has no Offspec Exceptions section.`);
    return;
  }

  for (const offspecId of offspecIds) {
    if (!new RegExp(`^###\\s+${escapeRegExp(offspecId)}\\s*$`, "m").test(section)) {
      error(`${rel} is missing Offspec Exceptions entry ${offspecId}.`);
    }
  }

  for (const required of [
    "Reason:",
    "Why now:",
    "Impacted area:",
    "Follow-up required:",
    "Approved by:",
    "Approved at:",
  ]) {
    if (!section.includes(required)) {
      error(`${rel} Offspec Exceptions section is missing ${required}`);
    }
  }
}

function validatePlanHumanVerification(rel, text) {
  const section = extractMarkdownSection(text, "Human Verification");
  if (!section.trim()) {
    error(`${rel} must contain a Human Verification section.`);
    return;
  }

  for (const heading of ["Prerequisites", "Steps", "Expected Results", "Evidence"]) {
    if (!new RegExp(`^###\\s+${escapeRegExp(heading)}\\s*$`, "m").test(section)) {
      error(`${rel} Human Verification section is missing ${heading}.`);
    }
  }

  const stepsSection = extractSubsection(section, "Steps");
  const numberedSteps = stepsSection
    .split(/\r?\n/)
    .filter((line) => /^\s*\d+\.\s+\S/.test(line));

  if (numberedSteps.length === 0) {
    error(`${rel} Human Verification Steps must contain numbered manual steps.`);
  }

  const expectedResults = extractSubsection(section, "Expected Results");
  const expectedItems = expectedResults
    .split(/\r?\n/)
    .filter((line) => /^\s*-\s+\S/.test(line) || /^\s*\d+\.\s+\S/.test(line));

  if (expectedItems.length === 0) {
    error(`${rel} Human Verification Expected Results must contain observable outcomes.`);
  }
}

function validateDonePlanChangelogs(rel, meta) {
  if (meta.status !== "Done") return;

  if (!Array.isArray(meta.changelog_refs) || meta.changelog_refs.length === 0) {
    error(`${rel} is Done and must list updated changelog_refs.`);
    return;
  }

  for (const changelog of meta.changelog_refs) {
    const target = path.join(ROOT, changelog);
    if (!changelog.startsWith("changelogs/") || !fs.existsSync(target)) {
      error(`${rel} references missing changelog ${changelog}.`);
      continue;
    }

    const text = fs.readFileSync(target, "utf8");
    if (!text.includes(meta.id)) {
      error(`${rel} references ${changelog}, but that changelog does not contain ${meta.id}.`);
    }
  }

  const requiredChangelogs = expectedChangelogsForPlan(meta);
  for (const required of requiredChangelogs) {
    if (!meta.changelog_refs.includes(required)) {
      error(`${rel} is Done and must reference ${required} for its work_area or impacted_areas.`);
    }
  }
}

function expectedChangelogsForPlan(meta) {
  const expected = new Set();
  for (const area of [meta.work_area, ...normalizeList(meta.impacted_areas)]) {
    const changelog = CHANGELOG_BY_AREA.get(area);
    if (changelog) expected.add(changelog);
  }
  return expected;
}

function validateRelationIds(source, id, field, ids, known) {
  for (const targetId of ids) {
    if (!targetId || targetId === "null") continue;
    if (!known.has(targetId)) {
      error(`${source} ${id} ${field} references unknown spec ${targetId}.`);
    }
  }
}

function validateIdArray(source, field, ids) {
  const seen = new Set();
  for (const id of ids) {
    if (typeof id !== "string") {
      error(`${source} ${field} must contain only spec ids as strings.`);
      continue;
    }
    if (id === "null") {
      error(`${source} ${field} must not contain string "null"; use an empty array instead.`);
      continue;
    }
    if (seen.has(id)) {
      error(`${source} ${field} contains duplicate spec id ${id}.`);
      continue;
    }
    seen.add(id);
  }
}

function parseFrontmatter(text, rel, options = { strict: true }) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) {
    if (options.strict) {
      error(`${rel} is missing YAML frontmatter.`);
    } else {
      warn(`${rel} is missing YAML frontmatter. Draft specs are not blocked, but this must be fixed before acceptance.`);
    }
    return null;
  }

  return {
    meta: parseSimpleYaml(match[1], rel, options),
    body: text.slice(match[0].length),
  };
}

function parseSimpleYaml(source, rel, options = { strict: true }) {
  const meta = {};
  const lines = source.split(/\r?\n/);

  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith("#")) continue;
    if (/^\s/.test(line)) {
      report(options.strict, `${rel} frontmatter only supports simple key: value lines.`);
      continue;
    }

    const index = line.indexOf(":");
    if (index === -1) {
      report(options.strict, `${rel} has invalid frontmatter line: ${line}`);
      continue;
    }

    const key = line.slice(0, index).trim();
    const rawValue = line.slice(index + 1).trim();
    meta[key] = parseValue(rawValue);
  }

  return meta;
}

function parseValue(value) {
  if (value === "null") return null;
  if (value === "true") return true;
  if (value === "false") return false;
  if (value.startsWith("[") && value.endsWith("]")) {
    try {
      return JSON.parse(value.replace(/'/g, "\""));
    } catch (_err) {
      return value;
    }
  }
  if (
    (value.startsWith("\"") && value.endsWith("\"")) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
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

function extractMarkdownSection(text, heading) {
  const lines = text.split(/\r?\n/);
  const startRe = new RegExp(`^##\\s+${escapeRegExp(heading)}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (startRe.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";

  const section = [];
  for (let i = start; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) break;
    section.push(lines[i]);
  }
  return section.join("\n");
}

function extractSubsection(text, heading) {
  const lines = text.split(/\r?\n/);
  const startRe = new RegExp(`^###\\s+${escapeRegExp(heading)}\\s*$`);
  let start = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (startRe.test(lines[i].trim())) {
      start = i + 1;
      break;
    }
  }
  if (start === -1) return "";

  const section = [];
  for (let i = start; i < lines.length; i += 1) {
    if (/^###\s+/.test(lines[i])) break;
    section.push(lines[i]);
  }
  return section.join("\n");
}

function normalizeList(value) {
  if (value === null || value === undefined || value === "" || value === "null") return [];
  if (Array.isArray(value)) return value;
  return [value];
}

function normalizeParent(value) {
  if (value === null || value === undefined || value === "" || value === "null") return null;
  return String(value);
}

function sameIdSet(left, right) {
  return canonicalIdList(left) === canonicalIdList(right);
}

function canonicalIdList(ids) {
  return [...new Set(ids)].sort().join("\n");
}

function listMarkdown(dir) {
  return listFiles(dir).filter((file) => file.endsWith(".md"));
}

function listFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...listFiles(fullPath));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

function listDocumentFiles(dir) {
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (IGNORED_DOCUMENT_DIRS.has(entry.name)) continue;
      files.push(...listDocumentFiles(path.join(dir, entry.name)));
      continue;
    }

    if (entry.isFile() && DOCUMENT_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(path.join(dir, entry.name));
    }
  }

  return files;
}

function readMode(argv) {
  const modeIndex = argv.indexOf("--mode");
  if (modeIndex !== -1 && argv[modeIndex + 1]) {
    return argv[modeIndex + 1];
  }

  const inline = argv.find((arg) => arg.startsWith("--mode="));
  if (inline) {
    return inline.slice("--mode=".length);
  }

  return "full";
}

function toRel(file) {
  return path.relative(ROOT, file).split(path.sep).join("/");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function error(message) {
  errors.push(message);
}

function warn(message) {
  warnings.push(message);
}

function report(strict, message) {
  if (strict) {
    error(message);
  } else {
    warn(message);
  }
}
