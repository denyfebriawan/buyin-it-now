# A multi-stage build: each stage is a separate throwaway image, and only the
# LAST one becomes the image that actually ships. This keeps two things
# separate that would otherwise bloat the final image together forever: the
# tools needed to BUILD the app (TypeScript, the compiler, every dev
# dependency) never make it into the image that RUNS the app.
#
# Debian ("bookworm-slim"), not Alpine: argon2 (used for password hashing)
# has a native binding that needs compiling, and Alpine's musl libc is a more
# common source of native-module surprises than glibc. Slim keeps the image
# reasonably small without that risk.

# ---------------------------------------------------------------- deps ----
# Installing dependencies is the slowest step, so it gets its own stage and
# its own layer: Docker only re-runs `npm ci` when package.json or
# package-lock.json actually change, not on every source-code edit.
#
# prisma/schema.prisma is copied here too, ahead of the rest of the app's
# source -- not because it's needed for the install itself, but because
# `npm ci` runs the `postinstall` script (`prisma generate`), which reads
# that file and would fail if it weren't there yet. Copying only the schema
# (not the whole project) keeps this layer cacheable across ordinary code
# changes; it only invalidates when the schema itself changes.
FROM node:24-bookworm-slim AS deps
WORKDIR /app
# Prisma's `generate` step (run below, via postinstall) checks for OpenSSL to
# decide which engine build to fetch. Without it Prisma still works here --
# this app talks to Postgres through the plain `pg` driver, never Prisma's
# native engine -- but it prints a "failed to detect" warning and guesses.
# Installing the real thing removes the guesswork.
RUN apt-get update && apt-get install -y --no-install-recommends openssl \
  && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

# -------------------------------------------------------------- builder ---
FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/generated ./generated
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# next build evaluates every route's server code once, while "collecting page
# data" -- even though nothing here is actually statically rendered -- and
# lib/session.ts refuses to even load without a SESSION_SECRET (on purpose,
# so a real deployment fails loudly instead of silently running unsigned
# sessions). These placeholders exist only to satisfy that module-load check
# during the build. They are NOT what the app runs with: this is a plain
# `process.env` read in ordinary server code, not a client-side value Next
# bakes into the bundle permanently, so the real values passed to `docker
# run` / docker-compose at container start take over completely.
ENV SESSION_SECRET=build-time-placeholder-not-used-at-runtime
ENV DATABASE_URL=postgresql://build:build@build-time-placeholder-not-used-at-runtime:5432/build
RUN npm run build

# --------------------------------------------------------------- runner ---
# The image that actually ships. Only three things come out of `builder`:
# the standalone server (Next.js's own dependency-tracing output: the app
# code plus only the specific node_modules files actually reached, not the
# whole tree), the static assets (JS/CSS bundles), and the public folder --
# neither of the last two is included in "standalone" automatically, so
# both are copied in by hand, exactly as Next.js's own docs describe.
FROM node:24-bookworm-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Runs as an ordinary, unprivileged user rather than root -- root inside a
# container can still do real damage if the app is ever compromised, and
# there is no reason a web server needs to be root to listen on a port.
RUN groupadd --system --gid 1001 nodejs \
  && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000

# The standalone output's own entry point, not `npm start` (which runs
# `next start`, expecting the full Next.js CLI and the complete node_modules
# tree -- neither of which this image has, on purpose).
CMD ["node", "server.js"]
