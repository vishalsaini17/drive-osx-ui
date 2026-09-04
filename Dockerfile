# syntax=docker/dockerfile:1
#
# OS shell. In development Vite serves the app; in production nginx serves the
# built static assets and proxies /api and /ws to the API.

ARG NODE_VERSION=24.13-alpine
ARG NGINX_VERSION=1.27-alpine

# ---------------------------------------------------------------- dependencies
FROM node:${NODE_VERSION} AS deps

WORKDIR /app

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm npm ci --ignore-scripts

# ----------------------------------------------------------------------- build
FROM deps AS build

# Vite inlines env at build time, so the API base path is a build argument.
# The default suits the nginx proxy in front of this image.
ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

COPY . .
RUN npm run build

# ------------------------------------------------------- dependencies (dev)
# Installed as the `node` user so node_modules is writable at runtime. The dev
# server writes its dependency cache into node_modules, and the anonymous
# volume Compose creates from this directory inherits these permissions.
FROM node:${NODE_VERSION} AS deps-dev

WORKDIR /app
RUN chown node:node /app
USER node

COPY --chown=node:node package.json package-lock.json ./
RUN --mount=type=cache,target=/home/node/.npm,uid=1000,gid=1000 npm ci --ignore-scripts

# ------------------------------------------------------------------------- dev
FROM deps-dev AS dev

ENV NODE_ENV=development

COPY --chown=node:node . .

EXPOSE 3000

# Tries https first (dev TLS cert present, self-signed — validation is
# disabled here since this is a loopback health probe, not a trust decision),
# falling back to http for a checkout with no cert generated yet. Either
# configuration must pass without editing this file (see vite.config.ts).
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=5 \
  CMD NODE_TLS_REJECT_UNAUTHORIZED=0 node -e "\
    const ok = (url) => fetch(url).then((r) => r.ok); \
    ok('https://127.0.0.1:3000/').catch(() => ok('http://127.0.0.1:3000/')).then((r) => process.exit(r ? 0 : 1)).catch(() => process.exit(1))"

CMD ["npm", "run", "dev"]

# ------------------------------------------------------------------ production
# Unprivileged nginx: runs as uid 101 and listens on 8080, so no capability to
# bind a privileged port is needed and the container never runs as root.
FROM nginxinc/nginx-unprivileged:${NGINX_VERSION} AS production

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 8080

HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -q --spider http://127.0.0.1:8080/ || exit 1
