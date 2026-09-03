FROM node:22-alpine3.24 AS builder
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
RUN npm ci
COPY apps/api apps/api
COPY apps/web/src apps/web/src
COPY packages/contracts packages/contracts
COPY prisma prisma
COPY scripts scripts

RUN npm run build -w @learnspace/api

FROM builder AS migration
RUN rm -rf \
  /usr/local/lib/node_modules/npm \
  /usr/local/bin/npm \
  /usr/local/bin/npx \
  /app/node_modules/vite \
  /app/node_modules/@esbuild \
  /app/node_modules/esbuild \
  /app/node_modules/.bin/vite \
  /app/node_modules/.bin/esbuild
USER node
CMD ["node", "node_modules/prisma/build/index.js", "migrate", "deploy", "--schema", "prisma/schema.prisma"]

FROM builder AS production-dependencies
RUN npm prune --omit=dev && rm -rf \
  /app/node_modules/vite \
  /app/node_modules/@esbuild \
  /app/node_modules/esbuild \
  /app/node_modules/.bin/vite \
  /app/node_modules/.bin/esbuild

FROM node:22-alpine3.24 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN rm -rf /usr/local/lib/node_modules/npm /usr/local/bin/npm /usr/local/bin/npx
COPY --from=production-dependencies --chown=node:node /app/node_modules ./node_modules
COPY --from=builder --chown=node:node /app/apps/api/dist ./apps/api/dist
COPY --from=builder --chown=node:node /app/apps/api/package.json ./apps/api/package.json
COPY --from=builder --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=builder --chown=node:node /app/packages/contracts/dist ./packages/contracts/dist
USER node
EXPOSE 4000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 CMD ["node", "-e", "fetch('http://127.0.0.1:4000/health/live').then(r=>{if(!r.ok)process.exit(1)}).catch(()=>process.exit(1))"]
CMD ["node", "apps/api/dist/server.js"]
