# Use Blender pre-built image
FROM blender:3.6.2

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy repo files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3000
EXPOSE 3000

# Start Node.js server
CMD ["npm", "start"]
