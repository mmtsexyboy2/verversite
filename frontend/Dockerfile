# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install application dependencies
RUN npm install

# Bundle app source
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the frontend port
EXPOSE 3000

# Command to run the application
CMD [ "npm", "start" ]
