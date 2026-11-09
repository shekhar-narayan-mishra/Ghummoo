# syntax=docker/dockerfile:1

FROM node:22-slim AS client
WORKDIR /app/client
COPY client/package.json client/package-lock.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

FROM node:22-slim
ENV NODE_ENV=production \
    PORT=5050
WORKDIR /app
COPY server/package.json server/package-lock.json ./server/
# Skip the embedded MongoDB download; set MONGODB_URI instead.
RUN MONGOMS_DISABLE_POSTINSTALL=1 npm ci --omit=dev --prefix server \
    && npm cache clean --force
COPY server/ ./server/
COPY --from=client /app/client/dist ./client/dist
RUN mkdir -p server/uploads && chown node:node server/uploads
USER node
EXPOSE 5050
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||5050)+'/api/health').then(r=>process.exit(r.ok?0:1),()=>process.exit(1))"
CMD ["node", "server/src/index.js"]
