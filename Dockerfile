# Use official Node.js image (upgraded to Node 20 to fix engine warnings)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of the app
COPY . .

# Generate Prisma client (this doesn't need database connection)
RUN npx prisma generate

# Build the NestJS app
RUN npm run build

# Expose the app port
EXPOSE 3000

# Create an entrypoint script that runs migrations before starting the app
COPY docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["docker-entrypoint.sh"]

# Start the app
CMD ["node", "dist/main"]