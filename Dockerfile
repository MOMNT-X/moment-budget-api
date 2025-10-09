# Use official Node.js image (Node 20 to match NestJS 11 engine requirements)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install --legacy-peer-deps

# Copy the rest of the app
COPY . .

# # Copy the .env file into the container (make sure it exists in root)
# COPY .env .env

# Generate Prisma client
RUN npx prisma generate

# Expose the app port
EXPOSE 3000

# Copy entrypoint script and give permission
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

# Default command (start production build)
CMD ["node", "dist/main"]
