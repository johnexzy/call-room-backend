FROM node:18-alpine AS builder

# Install build dependencies
RUN apk add --no-cache ffmpeg g++ make python3

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy only package files first to leverage Docker cache
COPY package*.json pnpm-lock.yaml ./

# Install dependencies with pnpm
RUN pnpm install --frozen-lockfile

# Copy source files
COPY . .

# Build the application
RUN pnpm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Combine all RUN commands into one
RUN apk add --no-cache ffmpeg && \
    npm install -g pnpm && \
    addgroup -S appgroup && \
    adduser -S appuser -G appgroup

# Copy only necessary files from builder
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/package.json ./
COPY --from=builder /usr/src/app/pnpm-lock.yaml ./

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Install dependencies and set permissions in one layer
RUN pnpm install --prod --frozen-lockfile && \
    pnpm store prune && \
    npm rebuild bcrypt --build-from-source && \
    chown -R appuser:appgroup /usr/src/app

USER appuser

EXPOSE 8080

CMD ["node", "dist/main.js"]