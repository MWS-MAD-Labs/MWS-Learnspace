FROM oven/bun:1.3.14-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY scripts scripts
RUN bun install --frozen-lockfile
COPY apps/web apps/web
COPY packages/contracts packages/contracts
RUN bun run --filter @learnspace/web build

FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime
COPY docker/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder --chown=nginx:nginx /app/apps/web/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 CMD ["wget", "-q", "-O", "/dev/null", "http://127.0.0.1:8080/health"]
