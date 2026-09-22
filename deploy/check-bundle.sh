#!/bin/sh
# Fails the build if the bundle could address the API by host and port.
#
# The API serves no CORS headers, so a cross-origin call fails preflight in the
# browser. The panel must therefore only ever call /api/... relative. This runs
# inside the build stage so the failure happens here, not on the VM.
#
# Run standalone against a local build with:  sh deploy/check-bundle.sh dist

set -eu

DIST="${1:-dist}"
status=0

fail() {
    echo "BUNDLE REJECTED: $1" >&2
    status=1
}

# 1. The API's port must not appear anywhere.
if grep -rIn '18000' "$DIST" >/dev/null 2>&1; then
    fail "the bundle contains the API port 18000"
    grep -rIn '18000' "$DIST" >&2 || true
fi

# 2. No absolute URL may carry an explicit port. This is the check that
#    actually matters: a port is what makes a URL able to reach a service.
if grep -rInoE 'https?://[A-Za-z0-9._-]+:[0-9]+' "$DIST" >/dev/null 2>&1; then
    fail "the bundle contains an absolute URL with a port"
    grep -rInoE 'https?://[A-Za-z0-9._-]+:[0-9]+' "$DIST" >&2 || true
fi

# 3. "localhost" is only tolerable as the bare, portless, pathless string
#    "http://localhost" that react-router uses as a parsing base for relative
#    paths. Anything addressable — a port, or a path — is rejected.
if grep -rInoE 'localhost:[0-9]+|localhost/[A-Za-z0-9]' "$DIST" >/dev/null 2>&1; then
    fail "the bundle contains an addressable localhost URL"
    grep -rInoE 'localhost:[0-9]+|localhost/[A-Za-z0-9]' "$DIST" >&2 || true
fi

# 4. No remote stylesheet, font or script may be referenced from the HTML. The
#    VM has no guaranteed egress, so anything fetched at runtime would fail.
if grep -rInoE '<(link|script)[^>]+(href|src)="https?://' "$DIST" >/dev/null 2>&1; then
    fail "the shipped HTML references a remote stylesheet or script"
    grep -rInoE '<(link|script)[^>]+(href|src)="https?://' "$DIST" >&2 || true
fi
if grep -rIn 'fonts.googleapis.com\|fonts.gstatic.com\|cdn.jsdelivr.net\|unpkg.com\|cdnjs.cloudflare.com' "$DIST" >/dev/null 2>&1; then
    fail "the bundle references a CDN"
    grep -rIn 'fonts.googleapis.com\|fonts.gstatic.com\|cdn.jsdelivr.net\|unpkg.com\|cdnjs.cloudflare.com' "$DIST" >&2 || true
fi

# 5. Fonts must be present as local files, or the panel silently falls back to
#    a system face on a VM with no egress.
fonts="$(find "$DIST" -name '*.woff2' | wc -l | tr -d ' ')"
if [ "$fonts" -lt 1 ]; then
    fail "no woff2 files in the build output; fonts are not self-hosted"
fi

[ "$status" -eq 0 ] || exit 1

# Report what survived, so the remaining vendor string is on the record rather
# than hidden by a narrower grep.
echo "bundle check passed:"
echo "  - '18000'                        : 0 occurrences"
echo "  - absolute URL with a port       : 0 occurrences"
echo "  - addressable localhost URL      : 0 occurrences"
echo "  - remote <link>/<script> in HTML : 0 occurrences"
echo "  - self-hosted woff2 files        : ${fonts}"
echo "  - bare 'http://localhost'        : $(grep -rIno 'http://localhost' "$DIST" | wc -l | tr -d ' ') occurrences"
echo "    (react-router's parsing base for relative paths: no port, no path,"
echo "     not reachable, and not used by this panel's fetch calls)"
