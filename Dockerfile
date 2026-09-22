# syntax=docker/dockerfile:1.7

# ---------------------------------------------------------------------------
# Stage 1 — build the bundle.
#
# The VM has no Node toolchain, so the image builds itself. Base images are
# pinned to exact tags: `latest` would make a rebuild on the VM a different
# build from the one verified here.
# ---------------------------------------------------------------------------
FROM node:22.11.0-alpine3.20 AS build

WORKDIR /app

# Manifest and lockfile first, on their own layer. A source edit then does not
# invalidate the install layer, so a rebuild on the VM does not re-resolve the
# dependency tree.
COPY package.json package-lock.json ./

# `npm ci` fails if the lockfile and manifest disagree, rather than silently
# re-resolving. The lockfile is committed for exactly this reason.
RUN npm ci

# Source last.
COPY tsconfig.json vite.config.ts index.html ./
COPY src ./src

# Typechecks, then bundles. Fonts come from node_modules via src/fonts.ts, so
# the output needs no network at runtime.
RUN npm run build

# Fail the build rather than ship a bundle that cannot work same-origin. The
# API has no CORS middleware, so an absolute origin in the bundle would fail
# preflight in the browser — and it would fail on the VM, not here.
COPY deploy/check-bundle.sh ./deploy/check-bundle.sh
RUN sh deploy/check-bundle.sh dist

# ---------------------------------------------------------------------------
# Stage 2 — runtime.
#
# Carries the built output and nginx only: no sources, no dev dependencies, no
# package-manager cache, no Node. The unprivileged nginx image already runs as
# uid 101 and listens on 8080.
# ---------------------------------------------------------------------------
FROM nginxinc/nginx-unprivileged:1.27.2-alpine AS runtime

# Rendered to /etc/nginx/conf.d/default.conf at start by the base image's
# 20-envsubst-on-templates.sh.
#
# The directory is created explicitly with a traversable mode first. COPY
# --chmod applies to the directories it creates as well as to the file, so a
# bare `COPY --chmod=0644 ... /etc/nginx/templates/x` leaves the directory
# 0644 — unreadable to uid 101, which makes the entrypoint log
# "find: /etc/nginx/templates/...: Permission denied" and fall back to the
# packaged default.conf. The panel then serves, but /api 404s and deep links
# break, which is a confusing way to find out.
RUN mkdir -p /etc/nginx/templates && chmod 0755 /etc/nginx/templates
COPY --chmod=0644 deploy/nginx.conf.template /etc/nginx/templates/default.conf.template

# Sourced before the template is rendered. The base image only sources a
# .envsh if it is executable.
COPY --chmod=0755 deploy/10-normalise-upstream.envsh /docker-entrypoint.d/10-normalise-upstream.envsh

COPY --from=build /app/dist /usr/share/nginx/html

# Defaults live here as well as in compose, so `docker run` with no environment
# still starts and serves.
ENV API_UPSTREAM=http://host.docker.internal:18000 \
    API_CALLER_HEADER=X-Caller \
    API_CALLER=scai-admin-panel

USER nginx

EXPOSE 8080

# Hits the panel's own root, not /api: this reports whether the panel is being
# served, which is independent of whether the upstream API is up. busybox wget
# is present; there is no curl in alpine.
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD wget --spider -q http://127.0.0.1:8080/ || exit 1
