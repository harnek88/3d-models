# Use linuxserver's Blender image
FROM linuxserver/blender:4.5.3-ls186

# Install Node.js
RUN apt-get update && apt-get install -y curl \
    && curl -fsSL https://deb.nodesource.com/setup_16.x | bash - \
    && apt-get install -y nodejs

WORKDIR /app

# Copy backend files
COPY . .

# Install Node.js dependencies
RUN npm install

EXPOSE 3000

CMD ["npm", "start"]
