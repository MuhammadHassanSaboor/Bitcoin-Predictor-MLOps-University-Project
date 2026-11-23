# syntax=docker/dockerfile:1
# Multi-stage build for the React dashboard.
#   docker build -t btc-forecast-ui:latest frontend

# ---------- Stage 1: build the static site with Node ----------
FROM node:20-alpine AS build
WORKDIR /ui
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

# ---------- Stage 2: serve it with Nginx (non-root image) ----------
FROM nginxinc/nginx-unprivileged:1.27-alpine AS runtime

# Where Nginx forwards /api/* requests (the Flask service).
#   docker-compose: api:5000     Kubernetes: <api-service-name>:80
ENV API_UPSTREAM=api:5000

COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /ui/dist /usr/share/nginx/html

EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
