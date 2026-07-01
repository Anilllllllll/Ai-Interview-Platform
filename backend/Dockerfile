# ============================================
# AI Interview App - Multi-Stage Dockerfile
# Production-optimized with security hardening
# ============================================
# WHY MULTI-STAGE?
# A single-stage build includes npm, npm cache, build tools —
# all unnecessary at runtime. Multi-stage lets us:
#   1. Use a "builder" stage to install dependencies
#   2. Copy ONLY the production artifacts to a clean final image
#   3. Result: smaller image, faster deploys, smaller attack surface


# ==========================================================
# STAGE 1: BUILDER
# Purpose: Install dependencies. This stage is thrown away.
# ==========================================================
FROM node:22-alpine AS builder
# 'AS builder' gives this stage a name so we can reference it later.
# This stage will contain npm, npm cache, and all build artifacts.
# None of that goes into the final image.

WORKDIR /app

# Copy dependency manifests first (layer caching trick — same as before)
COPY package.json package-lock.json ./

# Install production dependencies only
# npm ci is deterministic (uses lock file exactly)
# --omit=dev skips devDependencies (jest, nodemon, etc.)
RUN npm ci --omit=dev

# At this point, /app/node_modules has everything we need.
# npm cache (~25MB) is also in this stage but we DON'T CARE
# because we're not copying it to the final image.


# ==========================================================
# STAGE 2: PRODUCTION
# Purpose: Minimal runtime image. Only what's needed to RUN.
# ==========================================================
FROM node:22-alpine AS production
# This is a FRESH image — it has node.js but NOTHING from Stage 1.
# It's like starting with a clean plate.

# SECURITY: Create a non-root user
# WHY? By default, Docker runs everything as root.
# If an attacker exploits your app, they have ROOT access to the container.
# Running as a non-root user limits what an attacker can do.
# This is a MANDATORY security practice at companies.
# 'addgroup -S' and 'adduser -S' create a system user (no home dir, no password)
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

WORKDIR /app

# COPY FROM BUILDER: This is the multi-stage magic!
# 'COPY --from=builder' reaches into Stage 1 and copies ONLY node_modules.
# Everything else from Stage 1 (npm cache, npm metadata, temp files) is LEFT BEHIND.
# --chown=appuser:appgroup makes the files owned by our non-root user
COPY --from=builder --chown=appuser:appgroup /app/node_modules ./node_modules

# Copy application source code
# --chown ensures all files are owned by appuser, not root
COPY --chown=appuser:appgroup . .

# Create required directories (owned by appuser so the app can write to them)
RUN mkdir -p uploads logs && chown -R appuser:appgroup uploads logs

# Environment variables
ENV NODE_ENV=production
ENV PORT=5000

# EXPOSE port (documentation only)
EXPOSE 5000

# HEALTH CHECK
# Same as before — Docker pings /api/health every 30 seconds
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5000/api/health || exit 1

# SWITCH TO NON-ROOT USER
# Everything after this runs as 'appuser', not 'root'
# This is the last step before CMD so all setup (mkdir, chown) runs as root
USER appuser

# START THE APP
# Exec form for proper PID 1 signal handling
CMD ["node", "server.js"]
