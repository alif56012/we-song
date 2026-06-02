# Stage 1: Build
FROM oven/bun:1 AS builder
WORKDIR /app

# Install deps without lifecycle scripts (no .git in Docker, source files not yet present)
COPY package.json bun.lock ./
RUN bun install --ignore-scripts

# Expose local vp binary
ENV PATH="/app/node_modules/.bin:$PATH"

# Copy source and build with Vite+
COPY . .
RUN vp build

# Stage 2: Production (build output is self-contained, no node_modules needed)
FROM node:22-alpine AS runner
WORKDIR /app

COPY --from=builder /app/build ./build

EXPOSE 3000
ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

CMD ["node", "build/index.js"]
