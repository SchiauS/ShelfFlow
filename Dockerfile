# ---- build client ----
FROM node:22-alpine AS client-build
WORKDIR /app
COPY package.json package-lock.json ./
COPY client/package.json client/
COPY server/package.json server/
RUN npm ci --workspace client --include-workspace-root=false
COPY client ./client
RUN npm run build --workspace client

# ---- runtime ----
FROM node:22-alpine
RUN apk add --no-cache curl && addgroup -S app && adduser -S -G app app
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json ./server/
RUN npm ci --workspace server --omit=dev --include-workspace-root=false && npm cache clean --force
COPY server ./server
COPY --from=client-build /app/client/dist ./client/dist
RUN mkdir -p /app/storage/uploads && chown -R app:app /app
USER app
ENV NODE_ENV=production PORT=3000
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://127.0.0.1:3000${BASE_PATH:-/projects/shelfflow}/healthz || exit 1
CMD ["node", "server/src/index.js"]
