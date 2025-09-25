# Use linuxserver Blender image
FROM linuxserver/blender:4.5.3-ls186

# Install Node.js 16.x and update npm
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@11.6.1

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
