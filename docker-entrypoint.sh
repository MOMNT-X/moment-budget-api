#!/bin/sh
set -e

echo "🚀 Starting container..."

# Load environment variables if not automatically loaded
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

echo "🛠 Running database migrations..."
npx prisma migrate deploy

echo "✅ Starting the application..."
exec "$@"
