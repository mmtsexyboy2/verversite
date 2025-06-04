# Stage 1: Dependencies and Build
FROM node:18-alpine AS deps

WORKDIR /usr/src/app

# Copy package.json and package-lock.json (or yarn.lock)
COPY package*.json ./
# COPY yarn.lock ./ # Uncomment if using Yarn

# Install dependencies
RUN npm install
# RUN yarn install # Uncomment if using Yarn

# Stage 2: Build
FROM node:18-alpine AS builder

WORKDIR /usr/src/app

# Copy dependencies from the 'deps' stage
COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY . .

# Build the Next.js application
RUN npm run build
# RUN yarn build # Uncomment if using Yarn

# Stage 3: Production
FROM node:18-alpine AS runner

WORKDIR /usr/src/app

ENV NODE_ENV=production
# Optionally, if you need to serve under a sub-path:
# ENV NEXT_PUBLIC_BASE_PATH=/my-app

# Copy built app from builder stage
COPY --from=builder /usr/src/app/public ./public
COPY --from=builder /usr/src/app/.next ./.next
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/package.json ./package.json

# Expose port for Next.js app (default is 3000)
EXPOSE 3000

# Command to run the Next.js production server
# The "next start" command requires the .next folder and package.json (and node_modules)
CMD ["npm", "start"]
# CMD ["yarn", "start"] # Uncomment if using Yarn
