#!/bin/bash

# Moment Budget API - Database Setup Script
# This script sets up the database and generates Prisma client

echo "🚀 Moment Budget API - Database Setup"
echo "======================================"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "📝 Please copy .env.example to .env and fill in your database credentials."
    echo ""
    echo "Run: cp .env.example .env"
    exit 1
fi

# Check if DATABASE_URL is set
if ! grep -q "^DATABASE_URL=" .env; then
    echo "❌ Error: DATABASE_URL not found in .env file!"
    echo "📝 Please add your database connection string to .env"
    exit 1
fi

echo "✅ Environment file found"
echo ""

# Generate Prisma Client
echo "📦 Step 1: Generating Prisma Client..."
npx prisma generate

if [ $? -ne 0 ]; then
    echo "❌ Failed to generate Prisma client"
    exit 1
fi

echo "✅ Prisma client generated successfully"
echo ""

# Run migrations
echo "🔄 Step 2: Running database migrations..."
npx prisma migrate dev --name add_bill_transfers_beneficiaries_goals

if [ $? -ne 0 ]; then
    echo "❌ Failed to run migrations"
    echo "💡 Tip: Make sure your database is accessible and credentials are correct"
    exit 1
fi

echo "✅ Migrations completed successfully"
echo ""

# Build the project
echo "🏗️  Step 3: Building the project..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    echo "💡 Check the error messages above"
    exit 1
fi

echo "✅ Build completed successfully"
echo ""

# Success message
echo "🎉 Setup completed successfully!"
echo ""
echo "📚 Next steps:"
echo "  1. Review the new features in IMPROVEMENTS_SUMMARY.md"
echo "  2. Check API documentation in API_DOCUMENTATION.md"
echo "  3. Start the development server: npm run start:dev"
echo "  4. Test the new endpoints"
echo ""
echo "🔥 New features available:"
echo "  - Bill payments via Paystack transfers"
echo "  - Beneficiary management"
echo "  - Financial goals tracking"
echo "  - Recurring expenses automation"
echo "  - Advanced spending insights"
echo ""
echo "Happy coding! 🚀"
