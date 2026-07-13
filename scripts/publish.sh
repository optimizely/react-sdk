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
#   NODE_AUTH_TOKEN  Auth token for the target registry. The caller is expected
#                    to have configured .npmrc (e.g. via actions/setup-node) so
#                    that @optimizely resolves to <registry-url> with this token.
#   DRY_RUN          When "true", report what would happen (publish vs. skip)
#                    without actually publishing.
#
# Behavior:
#   - Skips (exit 0) if the version already exists on the target registry, so
#     re-running a release or the backfill is always a safe no-op.
#   - Computes the dist-tag from the version string (beta/alpha/rc/latest) so a
#     pre-release never moves the `latest` pointer.
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
