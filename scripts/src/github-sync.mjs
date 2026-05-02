#!/usr/bin/env node
/**
 * github-sync.mjs — Push all local files to GitHub using the REST API
 * (no git commands needed — works even when git index is locked)
 * 
 * Usage: node scripts/src/github-sync.mjs "commit message"
 */

import fs from "fs";
import path from "path";

const OWNER = "JBlizzard-sketch";
const REPO = "jengo";
const BRANCH = "main";
const TOKEN = process.env.GITHUB_PERSONAL_ACCESS_TOKEN;
const BASE = "/home/runner/workspace";

if (!TOKEN) { console.error("GITHUB_PERSONAL_ACCESS_TOKEN not set"); process.exit(1); }

const COMMIT_MSG = process.argv[2] || "chore: sync workspace files";

// Directories and files to include
const INCLUDE_PATTERNS = [
  "artifacts/jengo/src",
  "artifacts/api-server/src",
  "lib/db/src",
  "lib/api-spec/src",
  "lib/api-client-react/src",
  "lib/api-zod/src",
  "scripts/src",
  "README.md",
  "replit.md",
  "pnpm-workspace.yaml",
  "package.json",
  "tsconfig.json",
  "tsconfig.base.json",
  "artifacts/jengo/package.json",
  "artifacts/jengo/vite.config.ts",
  "artifacts/jengo/tsconfig.json",
  "artifacts/jengo/index.html",
  "artifacts/api-server/package.json",
  "artifacts/api-server/tsconfig.json",
  "artifacts/api-server/build.mjs",
  "lib/db/package.json",
  "lib/db/tsconfig.json",
  "lib/db/drizzle.config.ts",
  "lib/api-spec/package.json",
  "lib/api-spec/tsconfig.json",
  "lib/api-spec/orval.config.ts",
  "lib/api-client-react/package.json",
  "lib/api-client-react/tsconfig.json",
  "lib/api-zod/package.json",
  "lib/api-zod/tsconfig.json",
  "scripts/package.json",
  "scripts/tsconfig.json",
];

const SKIP_EXTENSIONS = [".map", ".lock"];
const SKIP_NAMES = ["node_modules", "dist", ".git", ".cache", "pnpm-lock.yaml"];

// GitHub API helper
async function gh(method, endpoint, body) {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    method,
    headers: {
      "Authorization": `Bearer ${TOKEN}`,
      "Accept": "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(`GitHub ${method} ${endpoint} → ${res.status}: ${JSON.stringify(data).slice(0, 200)}`);
  return data;
}

// Collect all files to upload
function collectFiles(dirOrFile, files = []) {
  const abs = path.isAbsolute(dirOrFile) ? dirOrFile : path.join(BASE, dirOrFile);
  if (!fs.existsSync(abs)) return files;
  const stat = fs.statSync(abs);
  if (stat.isFile()) {
    const rel = path.relative(BASE, abs);
    const ext = path.extname(rel);
    if (!SKIP_EXTENSIONS.includes(ext)) files.push(rel);
  } else if (stat.isDirectory()) {
    for (const entry of fs.readdirSync(abs)) {
      if (SKIP_NAMES.includes(entry)) continue;
      collectFiles(path.join(abs, entry), files);
    }
  }
  return files;
}

// Create a blob for a file
async function createBlob(relPath) {
  const content = fs.readFileSync(path.join(BASE, relPath));
  const b64 = content.toString("base64");
  const blob = await gh("POST", `/repos/${OWNER}/${REPO}/git/blobs`, { content: b64, encoding: "base64" });
  return { path: relPath, mode: "100644", type: "blob", sha: blob.sha };
}

async function main() {
  console.log("Collecting files...");
  const allFiles = [];
  for (const pattern of INCLUDE_PATTERNS) {
    collectFiles(pattern, allFiles);
  }
  // Deduplicate
  const files = [...new Set(allFiles)];
  console.log(`Found ${files.length} files to sync`);

  // Get base commit
  const branch = await gh("GET", `/repos/${OWNER}/${REPO}/branches/${BRANCH}`);
  const baseCommitSha = branch.commit.sha;
  const baseTreeSha = branch.commit.commit.tree.sha;
  console.log("Base commit:", baseCommitSha.slice(0, 8));

  // Create blobs in batches of 10
  console.log("Creating blobs...");
  const treeItems = [];
  const batchSize = 10;
  for (let i = 0; i < files.length; i += batchSize) {
    const batch = files.slice(i, i + batchSize);
    const items = await Promise.all(batch.map(createBlob));
    treeItems.push(...items);
    process.stdout.write(`\r  ${Math.min(i + batchSize, files.length)}/${files.length}`);
  }
  console.log("\nAll blobs created");

  // Create tree
  console.log("Creating tree...");
  const tree = await gh("POST", `/repos/${OWNER}/${REPO}/git/trees`, {
    base_tree: baseTreeSha,
    tree: treeItems,
  });

  // Create commit
  console.log("Creating commit...");
  const commit = await gh("POST", `/repos/${OWNER}/${REPO}/git/commits`, {
    message: COMMIT_MSG,
    tree: tree.sha,
    parents: [baseCommitSha],
    author: {
      name: "Jengo Bot",
      email: "jengo@replit.dev",
      date: new Date().toISOString(),
    },
  });

  // Update branch ref
  console.log("Updating branch ref...");
  await gh("PATCH", `/repos/${OWNER}/${REPO}/git/refs/heads/${BRANCH}`, {
    sha: commit.sha,
    force: false,
  });

  console.log(`\nPushed ${files.length} files`);
  console.log(`Commit: ${commit.sha.slice(0, 8)} — ${COMMIT_MSG}`);
  console.log(`https://github.com/${OWNER}/${REPO}`);
}

main().catch(e => { console.error("Error:", e.message); process.exit(1); });
