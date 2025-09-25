# Use official Node 20 LTS image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the app
COPY . .

# Expose the port your app will run on
EXPOSE 3000

# Set environment variables (optional default values, override in Render dashboard)
ENV NODE_ENV=production

# Start the app
CMD ["node", "server.js"]
