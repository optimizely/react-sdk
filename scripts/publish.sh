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
#   NODE_AUTH_TOKEN  Auth token for the target registry. Used both to read the
#                    registry (existence/dist-tag lookup) and, via the caller's
#                    .npmrc entry (`//<host>/:_authToken=${NODE_AUTH_TOKEN}`,
#                    which setup-node writes), to publish. This script passes
#                    --registry explicitly, so no scope-to-registry routing is
#                    required (and the GHR job intentionally does NOT route
#                    @optimizely to GHR, so that `npm ci` still installs
#                    dependencies from npm).
#   DRY_RUN          When "true", report what would happen (publish vs. skip)
#                    without actually publishing.
#
# Behavior:
#   - Reads the target registry's packument once (a single HTTP GET) and:
#       * 200 -> package exists; skip (exit 0) if this exact version is already
#         present, so re-running a release or the backfill is a safe no-op.
#       * 404 -> package/version absent; proceed to publish.
#       * any other status or a network failure -> abort (exit 1) rather than
#         guess. A flaky lookup must never be misread as "not published" and
#         trigger a publish.
#   - Computes the dist-tag from the version:
#       * pre-releases (beta/alpha/rc) get their own tag, never `latest`.
#       * a stable release gets `latest` ONLY when it is strictly greater (by
#         semver) than the registry's current `latest`. Otherwise it is tagged
#         `v<major>-last-published`, so `latest` never moves backwards onto an
#         older release — this covers both an older major (5.x shipped after
#         6.x) and an older minor of the current major (6.4.1 shipped while
#         latest is 6.5.0). This tag is per-major and always points at the most
#         recent non-latest publish on that major line; it is not a stable
#         pointer to a specific version, so publishing another older version on
#         the same major (e.g. 6.3.5 after 6.4.1, both below latest 6.5.0) moves
#         the tag to the newer publish.
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

# Returns 0 if $1 is strictly greater than $2 (numeric major.minor.patch). Only
# called for stable versions, so no pre-release precedence handling is needed.
version_gt() {
  local -a a b
  local i x y
  IFS=. read -ra a <<< "$1"
  IFS=. read -ra b <<< "$2"
  for i in 0 1 2; do
    x=${a[i]:-0}
    y=${b[i]:-0}
    (( 10#$x > 10#$y )) && return 0
    (( 10#$x < 10#$y )) && return 1
  done
  return 1
}

# --- Existence / current-latest lookup (single packument GET) ----------------
# npm scoped names are URL-encoded with the slash as %2f: @scope/name.
pkg_encoded="${pkg//\//%2f}"
packument_url="${registry%/}/${pkg_encoded}"

body_file=$(mktemp)
trap 'rm -f "$body_file"' EXIT

# curl -sS (no --fail) returns 0 for any HTTP response, non-zero only on
# network/protocol errors — so we can cleanly separate "server answered" from
# "could not reach server".
auth_header=""
if [[ -n "${NODE_AUTH_TOKEN:-}" ]]; then
  auth_header="Authorization: Bearer ${NODE_AUTH_TOKEN}"
fi
if ! http_code=$(curl -sS -m 30 -o "$body_file" -w '%{http_code}' \
      ${auth_header:+-H "$auth_header"} "$packument_url"); then
  echo "ERROR: request to ${packument_url} failed (network/timeout); refusing to publish on an ambiguous result." >&2
  exit 1
fi

current_latest=""
case "$http_code" in
  200)
    if jq -e --arg v "$version" '.versions[$v] != null' "$body_file" >/dev/null 2>&1; then
      echo "Version ${pkg}@${version} already on ${registry}, skipping."
      exit 0
    fi
    current_latest=$(jq -r '.["dist-tags"].latest // empty' "$body_file")
    ;;
  404)
    # Package (or this version) not published yet; nothing to compare against.
    current_latest=""
    ;;
  *)
    echo "ERROR: unexpected HTTP ${http_code} querying ${packument_url}; refusing to publish on an ambiguous result." >&2
    exit 1
    ;;
esac

# --- dist-tag selection ------------------------------------------------------
case "$version" in
  *-beta*)  tag=beta ;;
  *-alpha*) tag=alpha ;;
  *-rc*)    tag=rc ;;
  *)
    # Stable release: `latest` only if strictly greater than the current latest.
    if [[ -z "$current_latest" ]] || version_gt "$version" "$current_latest"; then
      tag=latest
    else
      major=${version%%.*}
      tag="v${major}-last-published"
      echo "Current latest is ${current_latest}; ${version} is not newer, tagging as ${tag} to preserve latest."
    fi
    ;;
esac

if [[ "$dry_run" == "true" ]]; then
  echo "[dry-run] would publish ${pkg}@${version} (tag: ${tag}) to ${registry}"
  exit 0
fi

provenance_flag=""
if [[ "$registry" == *"registry.npmjs.org"* ]]; then
  provenance_flag="--provenance"
fi

echo "Publishing ${pkg}@${version} (tag: ${tag}) to ${registry}"
if [[ -n "$tarball" ]]; then
  # The tarball is a prebuilt artifact; skip lifecycle scripts (prepublishOnly
  # = test + build) that would otherwise run from the current package.json.
  npm publish "$tarball" --registry "$registry" --tag "$tag" --ignore-scripts $provenance_flag
else
  npm publish --registry "$registry" --tag "$tag" $provenance_flag
fi
