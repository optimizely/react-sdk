#!/usr/bin/env bash
#
# Registry-agnostic, idempotent publish for @optimizely/react-sdk.
#
# Usage:
#   scripts/publish.sh <registry-url> [tarball]
#
# Args:
#   registry-url  Target registry, e.g. https://registry.npmjs.org
#                 or https://npm.pkg.github.com
#   tarball       Optional. When given, publishes that packed tarball instead
#                 of the current working directory (used by the GHR backfill).
#
# Env:
#   NODE_AUTH_TOKEN  Auth token for the target registry. The caller must have an
#                    .npmrc entry supplying auth for <registry-url>'s host, e.g.
#                    `//<host>/:_authToken=${NODE_AUTH_TOKEN}` (setup-node writes
#                    this). This script passes --registry explicitly, so no
#                    scope-to-registry routing is required (and the GHR job
#                    intentionally does NOT route @optimizely to GHR, so that
#                    `npm ci` still installs dependencies from npm).
#   DRY_RUN          When "true", report what would happen (publish vs. skip)
#                    without actually publishing.
#
# Behavior:
#   - Skips (exit 0) if the version already exists on the target registry, so
#     re-running a release or the backfill is always a safe no-op.
#   - Computes the dist-tag from the version string (beta/alpha/rc/latest) so a
#     pre-release never moves the `latest` pointer.
#   - For a stable release whose major is older than the registry's current
#     `latest` (e.g. a 5.x patch shipped after 6.x), tags it `v<major>-latest`
#     instead of `latest`, so `latest` never moves backwards onto an old major.
set -euo pipefail

dry_run="${DRY_RUN:-false}"

registry="${1:?usage: publish.sh <registry-url> [tarball]}"
tarball="${2:-}"

if [[ -n "$tarball" ]]; then
  # Derive name/version from the tarball's own package.json so the guard matches
  # exactly what we're about to publish (backfill of historical versions).
  meta=$(tar -xzO -f "$tarball" package/package.json)
  pkg=$(printf '%s' "$meta" | jq -r '.name')
  version=$(printf '%s' "$meta" | jq -r '.version')
else
  pkg=$(jq -r '.name' package.json)
  version=$(jq -r '.version' package.json)
fi

case "$version" in
  *-beta*)  tag=beta ;;
  *-alpha*) tag=alpha ;;
  *-rc*)    tag=rc ;;
  *)        tag=latest ;;
esac

if npm view "${pkg}@${version}" version --registry "$registry" >/dev/null 2>&1; then
  echo "Version ${pkg}@${version} already on ${registry}, skipping."
  exit 0
fi

# Don't let a stable release move `latest` backwards onto an older major. If the
# registry's current `latest` is already a newer major than this version, publish
# under `v<major>-latest` instead. (Only reached when actually publishing, so the
# extra lookup is skipped for no-op re-runs above.)
if [[ "$tag" == "latest" ]]; then
  current_latest=$(npm view "${pkg}" version --registry "$registry" 2>/dev/null || true)
  our_major=${version%%.*}
  latest_major=${current_latest%%.*}
  if [[ "$our_major" =~ ^[0-9]+$ && "$latest_major" =~ ^[0-9]+$ ]] && (( our_major < latest_major )); then
    tag="v${our_major}-latest"
    echo "Current latest is ${current_latest} (major ${latest_major}); tagging ${version} as ${tag} to preserve latest."
  fi
fi

if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] would publish ${pkg}@${version} (tag: ${tag}) to ${registry}"
  exit 0
fi

echo "Publishing ${pkg}@${version} (tag: ${tag}) to ${registry}"
if [[ -n "$tarball" ]]; then
  # The tarball is a prebuilt artifact; skip lifecycle scripts (prepublishOnly
  # = test + build) that would otherwise run from the current package.json.
  npm publish "$tarball" --registry "$registry" --tag "$tag" --ignore-scripts
else
  npm publish --registry "$registry" --tag "$tag"
fi
