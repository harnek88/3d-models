# Use linuxserver's Blender image
FROM linuxserver/blender:4.5.3-ls186

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

# Set working directory
WORKDIR /app

# Copy backend files
COPY . .

# Install Node.js dependencies
RUN npm install

# Expose port 3000
EXPOSE 3000

# Start server
CMD ["npm", "start"]
