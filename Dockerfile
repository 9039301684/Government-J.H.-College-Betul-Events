FROM node:22-bookworm-slim

ENV NODE_ENV=production
WORKDIR /app/backend

COPY backend/package.json backend/package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

WORKDIR /app
COPY index.html script.js style.css ./
COPY backend/app.js backend/db.js backend/server.js ./backend/
COPY backend/routes ./backend/routes
COPY backend/middleware ./backend/middleware

WORKDIR /app/backend
EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

USER node
CMD ["node", "server.js"]
