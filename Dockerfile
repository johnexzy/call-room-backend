# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install dependencies
RUN pnpm install

# Copy source code
COPY . .

# Build the application
RUN pnpm build

# Production stage
FROM node:20-alpine

WORKDIR /app

# Install Cloud SQL Auth Proxy
ADD https://dl.google.com/cloudsql/cloud_sql_proxy.linux.amd64 /cloud_sql_proxy
RUN chmod +x /cloud_sql_proxy

# Copy package files
COPY package.json pnpm-lock.yaml ./

# Install pnpm
RUN npm install -g pnpm

# Install production dependencies only
RUN pnpm install --prod

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 8080

# Start Cloud SQL Proxy and NestJS app
CMD ["/cloud_sql_proxy", "gen-lang-client-0577225072:us-central1:example-instance", "&", "node", "dist/main"]
