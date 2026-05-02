#!/usr/bin/env bash
# github-push.sh — Push current branch to GitHub
# Usage:
#   bash scripts/src/github-push.sh                    # push current HEAD
#   bash scripts/src/github-push.sh "commit message"   # stage all, commit, push
#
# Requires: GITHUB_PERSONAL_ACCESS_TOKEN environment secret

set -e

REPO_OWNER="JBlizzard-sketch"
REPO_NAME="jengo"
BRANCH="main"

if [ -z "$GITHUB_PERSONAL_ACCESS_TOKEN" ]; then
  echo "ERROR: GITHUB_PERSONAL_ACCESS_TOKEN is not set"
  exit 1
fi

REMOTE_URL="https://${REPO_OWNER}:${GITHUB_PERSONAL_ACCESS_TOKEN}@github.com/${REPO_OWNER}/${REPO_NAME}.git"

# If a commit message was given, stage everything and commit
if [ -n "$1" ]; then
  git add -A
  git diff --cached --quiet || git commit -m "$1"
fi

# Push directly using the token-in-URL approach (avoids needing a named remote)
echo "Pushing to github.com/${REPO_OWNER}/${REPO_NAME} [${BRANCH}]..."
git push "$REMOTE_URL" "${BRANCH}" 2>&1 | sed "s/${GITHUB_PERSONAL_ACCESS_TOKEN}/***TOKEN***/g"

echo ""
echo "Done — https://github.com/${REPO_OWNER}/${REPO_NAME}"
