###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:18-alpine AS development

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Create app directory
WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

# Copy application dependency manifests
COPY --chown=node:node package*.json ./

# Install dependencies
RUN pnpm install

# Bundle app source
COPY --chown=node:node . .

# Use the node user from the image (instead of the root user)
USER node

###################
# BUILD FOR PRODUCTION
###################

FROM node:18-alpine AS build

# Install FFmpeg and build dependencies
RUN apk add --no-cache ffmpeg python3 make g++

# Verify FFmpeg installation
RUN ffmpeg -version

WORKDIR /usr/src/app

# Install pnpm globally
RUN npm install -g pnpm

COPY --chown=node:node package*.json ./

# Copy node_modules from development stage
COPY --chown=node:node --from=development /usr/src/app/node_modules ./node_modules

COPY --chown=node:node . .

# Build the application
RUN pnpm run build

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Install production dependencies and prune pnpm store
RUN pnpm install

# Rebuild bcrypt
RUN npm rebuild bcrypt --build-from-source

# Create a non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Set permissions
RUN chown -R appuser:appgroup /usr/src/app
RUN chmod -R 755 /usr/src/app

# Switch to non-root user
USER appuser

###################
# PRODUCTION
###################

FROM node:18-alpine AS production

# Install FFmpeg
RUN apk add --no-cache ffmpeg

# Verify FFmpeg installation
RUN ffmpeg -version

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Expose port
EXPOSE 8080

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Use the node user from the image (instead of the root user)
USER node

# Start the server using the production build
CMD ["node", "dist/main.js"]