# Base Blender image
FROM linuxserver/blender:4.5.3-ls186

# Install Node.js 20.x
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy backend files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start backend
CMD ["npm", "start"]
