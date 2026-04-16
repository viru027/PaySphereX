# ── Backend Dockerfile ──────────────────────────────────
# File: backend/Dockerfile
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN mkdir -p uploads logs
EXPOSE 5000
CMD ["node", "src/index.js"]
