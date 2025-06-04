# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
#apk add --no-cache netcat-openbsd # For nc command in entrypoint, if used
RUN apk add --no-cache netcat-openbsd && npm install

# Bundle app source
COPY . .

# Expose the backend port
EXPOSE 3001

# Copy entrypoint script and make it executable
COPY entrypoint.sh /usr/src/app/entrypoint.sh
RUN chmod +x /usr/src/app/entrypoint.sh

# Set the entrypoint
ENTRYPOINT ["/usr/src/app/entrypoint.sh"]
