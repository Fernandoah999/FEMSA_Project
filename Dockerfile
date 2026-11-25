FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
ENV FEMSA_STANDALONE=1

COPY Front/package.json Front/package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY Front/next.config.ts Front/tsconfig.json ./
COPY Front/src ./src
COPY Front/public ./public
COPY Front/scripts/read-inventory.py ./scripts/read-inventory.py
RUN npm run check

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 \
    && rm -rf /var/lib/apt/lists/* \
    && install -d -o node -g node /app/data

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3040 \
    HOSTNAME=0.0.0.0 \
    FEMSA_DATA_DIR=/app/data

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/scripts/read-inventory.py ./scripts/read-inventory.py

USER node
EXPOSE 3040
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3040/api/snapshots').then(response => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))"]

CMD ["node", "server.js"]
