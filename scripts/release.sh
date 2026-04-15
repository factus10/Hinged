#!/usr/bin/env bash
#
# Release helper for the Hinged Electron app.
#
# Bumps electron/package.json to <version>, commits the bump, creates a
# signed annotated tag v<version>, and pushes main + the tag to origin.
# The .github/workflows/electron-build.yml workflow picks up the tag,
# builds mac/windows/linux, and publishes a GitHub Release with the
# platform binaries attached.
#
# Usage:
#   ./scripts/release.sh <version>
#   ./scripts/release.sh --skip-tests <version>
#
# Examples:
#   ./scripts/release.sh 0.2.0
#   ./scripts/release.sh 0.2.0-beta.1
#
# Requires: git, node, npm, and a clean checkout on main.

set -euo pipefail

# ---------- helpers ----------

red()    { printf '\033[31m%s\033[0m\n' "$*" >&2; }
green()  { printf '\033[32m%s\033[0m\n' "$*"; }
yellow() { printf '\033[33m%s\033[0m\n' "$*"; }
blue()   { printf '\033[34m%s\033[0m\n' "$*"; }
bold()   { printf '\033[1m%s\033[0m\n' "$*"; }

die() { red "$*"; exit 1; }

usage() {
  cat <<EOF
Usage: $(basename "$0") [options] <version>

Arguments:
  <version>        Semver version, e.g. 0.2.0 or 0.2.0-beta.1

Options:
  --skip-tests     Don't run typecheck + tests before tagging
  -h, --help       Show this message

The script will:
  1. Validate you're on a clean main branch, in sync with origin
  2. Validate the version looks like semver and the tag doesn't exist
  3. Run typecheck + tests (unless --skip-tests)
  4. Bump electron/package.json
  5. Show you the diff and ask for confirmation
  6. Commit, create an annotated tag v<version>, and push both

GitHub Actions then handles the build and release.
EOF
}

# ---------- parse args ----------

SKIP_TESTS=0
VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-tests)
      SKIP_TESTS=1
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      die "Unknown option: $1 (try --help)"
      ;;
    *)
      if [[ -z "$VERSION" ]]; then
        VERSION="$1"
      else
        die "Unexpected argument: $1 (version already set to $VERSION)"
      fi
      shift
      ;;
  esac
done

if [[ -z "$VERSION" ]]; then
  usage
  exit 1
fi

# Allow semver with optional pre-release and build metadata
if ! [[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?(\+[A-Za-z0-9.-]+)?$ ]]; then
  die "Version '$VERSION' doesn't look like semver (e.g. 0.2.0, 0.2.0-beta.1)"
fi

TAG="v$VERSION"

# ---------- locate repo ----------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
ELECTRON_DIR="$REPO_ROOT/electron"
PKG_JSON="$ELECTRON_DIR/package.json"
PKG_LOCK="$ELECTRON_DIR/package-lock.json"

[[ -f "$PKG_JSON" ]] || die "Can't find $PKG_JSON"

cd "$REPO_ROOT"

# ---------- git sanity checks ----------

CURRENT_BRANCH="$(git rev-parse --abbrev-ref HEAD)"
if [[ "$CURRENT_BRANCH" != "main" ]]; then
  die "Not on main branch (on '$CURRENT_BRANCH'). Releases must be cut from main."
fi

# Only block on uncommitted changes inside the directories that affect
# the build (electron/ source + the workflow + this script). Unrelated
# scratch changes elsewhere in the working tree are fine.
RELEASE_PATHS=(electron .github/workflows scripts)
if ! git diff --quiet -- "${RELEASE_PATHS[@]}" \
   || ! git diff --cached --quiet -- "${RELEASE_PATHS[@]}"; then
  red "Working tree has uncommitted changes in release-relevant paths:"
  git status --short -- "${RELEASE_PATHS[@]}" >&2
  red "Commit or stash them first."
  exit 1
fi

blue "Fetching from origin..."
git fetch origin main --tags

LOCAL_SHA="$(git rev-parse HEAD)"
REMOTE_SHA="$(git rev-parse origin/main 2>/dev/null || echo "")"
if [[ -n "$REMOTE_SHA" && "$LOCAL_SHA" != "$REMOTE_SHA" ]]; then
  die "Local main ($LOCAL_SHA) is not in sync with origin/main ($REMOTE_SHA). Pull or push first."
fi

if git rev-parse "$TAG" >/dev/null 2>&1; then
  die "Tag $TAG already exists locally."
fi

if git ls-remote --tags origin "refs/tags/$TAG" | grep -q "$TAG"; then
  die "Tag $TAG already exists on origin."
fi

# ---------- version sanity ----------

CURRENT_VERSION="$(node -p "require('$PKG_JSON').version")"
if [[ "$CURRENT_VERSION" == "$VERSION" ]]; then
  die "Version is already $VERSION in package.json. Nothing to bump."
fi

bold "Release plan"
echo "  current version : $CURRENT_VERSION"
echo "  new version     : $VERSION"
echo "  tag             : $TAG"
echo "  branch          : $CURRENT_BRANCH ($LOCAL_SHA)"
echo

# ---------- typecheck + tests ----------

if [[ $SKIP_TESTS -eq 0 ]]; then
  blue "Running typecheck + tests..."
  (cd "$ELECTRON_DIR" && npm run typecheck && npm test)
  green "Tests passed."
else
  yellow "Skipping typecheck + tests (--skip-tests)"
fi

# ---------- bump ----------

blue "Bumping $PKG_JSON: $CURRENT_VERSION → $VERSION"
(
  cd "$ELECTRON_DIR"
  # --no-git-tag-version: don't create a commit or tag; we do that ourselves
  # --allow-same-version: (belt and suspenders; we checked above)
  npm version "$VERSION" --no-git-tag-version --allow-same-version >/dev/null
)

# Show what changed
echo
bold "Diff:"
git --no-pager diff -- "$PKG_JSON" "$PKG_LOCK" 2>/dev/null || git --no-pager diff -- "$PKG_JSON"
echo

# ---------- confirm ----------

yellow "About to:"
yellow "  1. commit  'Release $TAG'"
yellow "  2. tag     $TAG  (annotated)"
yellow "  3. push    origin main"
yellow "  4. push    origin $TAG"
echo
read -r -p "Proceed? [y/N] " confirm
if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
  red "Aborted. Reverting package.json..."
  git checkout -- "$PKG_JSON" 2>/dev/null || true
  [[ -f "$PKG_LOCK" ]] && git checkout -- "$PKG_LOCK" 2>/dev/null || true
  exit 1
fi

# ---------- commit + tag + push ----------

git add "$PKG_JSON"
[[ -f "$PKG_LOCK" ]] && git add "$PKG_LOCK"
git commit -m "Release $TAG"

git tag -a "$TAG" -m "Release $TAG"

blue "Pushing main..."
git push origin main

blue "Pushing $TAG..."
git push origin "$TAG"

echo
green "Released $TAG."
echo
REMOTE_URL="$(git config --get remote.origin.url || true)"
if [[ -n "$REMOTE_URL" ]]; then
  # Derive a GitHub owner/repo from common URL formats
  REPO_PATH="$(echo "$REMOTE_URL" | sed -E 's#(git@github\.com:|https://github\.com/)([^/]+/[^/.]+)(\.git)?#\2#')"
  if [[ "$REPO_PATH" != "$REMOTE_URL" ]]; then
    green "Watch the build:"
    green "  https://github.com/$REPO_PATH/actions"
    green "When it finishes, the release will appear at:"
    green "  https://github.com/$REPO_PATH/releases/tag/$TAG"
  fi
fi
