FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY scripts scripts
RUN bun install --frozen-lockfile
COPY apps/api apps/api
COPY apps/web/src apps/web/src
COPY packages/contracts packages/contracts
COPY prisma prisma

RUN bun run --filter @learnspace/api build
RUN mkdir -p /artifacts/prisma-client /artifacts/prisma-generated /artifacts/central-auth && \
    cp -R -L apps/api/node_modules/@prisma/client/. /artifacts/prisma-client/ && \
    cp -R -L apps/api/node_modules/@prisma/client/../../.prisma/. /artifacts/prisma-generated/ && \
    cp -R -L apps/api/node_modules/mws-central-auth/dist/. /artifacts/central-auth/

FROM builder AS migration
USER bun
CMD ["bunx", "prisma", "migrate", "deploy", "--schema", "prisma/schema.prisma"]

FROM oven/bun:1.3.14-alpine AS production-dependencies
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY scripts scripts
RUN bun install --frozen-lockfile --production --ignore-scripts

FROM oven/bun:1.3.14-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
COPY --from=production-dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --from=production-dependencies --chown=bun:bun /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=production-dependencies --chown=bun:bun /app/packages/contracts/node_modules ./packages/contracts/node_modules
COPY --from=builder /artifacts /artifacts
RUN prisma_client="$(readlink -f apps/api/node_modules/@prisma/client)" && \
    prisma_modules="$(dirname "$(dirname "$prisma_client")")" && \
    central_auth="$(readlink -f apps/api/node_modules/mws-central-auth)" && \
    cp -R /artifacts/prisma-client/. "$prisma_client/" && \
    mkdir -p "$prisma_modules/.prisma" "$central_auth/dist" && \
    cp -R /artifacts/prisma-generated/. "$prisma_modules/.prisma/" && \
    cp -R /artifacts/central-auth/. "$central_auth/dist/" && \
    chown -R bun:bun "$prisma_client" "$prisma_modules/.prisma" "$central_auth/dist" && \
    rm -rf /artifacts
COPY --from=builder --chown=bun:bun /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=bun:bun /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=bun:bun /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=bun:bun /app/packages/contracts/dist ./packages/contracts/dist
USER bun
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD ["bun", "-e", "fetch('http://127.0.0.1:4000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["bun", "apps/api/dist/application/server.js"]
