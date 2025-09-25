# Use Node.js base image
FROM node:16

# Install Blender
RUN apt-get update && apt-get install -y blender

# Set working directory
WORKDIR /app

# Copy all repository files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3000
EXPOSE 3000

# Start Node.js server
CMD ["npm", "start"]
