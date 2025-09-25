# Use latest LTS Node.js version
FROM node:20

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json first (for caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# Copy the rest of your project files
COPY . .

# Expose port (matches your backend PORT env variable)
EXPOSE 3000

# Start the backend
CMD ["node", "server.js"]
