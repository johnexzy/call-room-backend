###################
# BUILD FOR LOCAL DEVELOPMENT
###################

FROM node:18-alpine AS development


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


###################
# PRODUCTION
###################

FROM node:18-alpine AS production

WORKDIR /usr/src/app

# Copy the bundled code from the build stage to the production image
COPY --chown=node:node --from=build /usr/src/app/node_modules ./node_modules
COPY --chown=node:node --from=build /usr/src/app/dist ./dist

# Set NODE_ENV environment variable
ENV NODE_ENV production

# Use the node user from the image (instead of the root user)
USER node

# Start the server using the production build
CMD ["node", "dist/main.js"]