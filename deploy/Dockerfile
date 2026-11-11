# Grim Chess: one Node 24 process serves the API, WebSocket play and the built web app.
# Build from the repo root:  docker build -f deploy/Dockerfile -t grim-chess .

# ---------- build ----------
FROM node:24-slim AS build
WORKDIR /app
ENV CI=true
# Manifests first for layer caching
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
COPY packages/core/package.json packages/core/
COPY packages/engine/package.json packages/engine/
RUN npm ci --no-audit --no-fund
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN npm run build
# Drop dev dependencies (vite, typescript, type packages) from the runtime image
RUN npm prune --omit=dev --no-audit --no-fund

# ---------- runtime ----------
FROM node:24-slim
ENV NODE_ENV=production MODE=cloud DATA_DIR=/data PORT=8080 HOST=0.0.0.0
WORKDIR /app
COPY --from=build /app/package.json /app/package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/packages ./packages
COPY --from=build /app/apps/server ./apps/server
COPY --from=build /app/apps/web/package.json ./apps/web/package.json
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY knowledge-base ./knowledge-base
COPY content ./content
# puzzles.csv.gz (+ benchmarks.json when present); databases are excluded by .dockerignore
COPY data ./data
COPY deploy/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod 755 /usr/local/bin/docker-entrypoint.sh \
 && mkdir -p /data && chown -R node:node /data \
 && chown -R root:root /app && chmod -R a+rX /app
VOLUME ["/data"]
EXPOSE 8080
# The entrypoint fixes ownership of a root-owned volume (Fly volumes mount as root), then drops to the
# unprivileged `node` user; the server itself never runs as root.
ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
CMD ["node", "apps/server/src/index.ts"]
