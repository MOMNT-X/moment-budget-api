# 🚀 Moment Budget API - Quick Start Guide

## What's New?

Your budgeting app backend has been significantly enhanced with powerful new features:

### ⭐ Key Features Added

1. **Bill Payment via Paystack Transfers**
   - Pay bills directly to bank accounts
   - Automatic account verification
   - Real-time transfer status tracking

2. **Beneficiary Management**
   - Save frequently used payment recipients
   - One-click bill payments
   - Secure bank account storage

3. **Financial Goals**
   - Set savings targets
   - Track progress automatically
   - Get motivated with visual progress

4. **Recurring Expenses**
   - Automate expense tracking
   - Never forget recurring payments
   - Daily/weekly/monthly/yearly schedules

5. **Advanced Analytics**
   - Spending insights by category
   - Budget performance tracking
   - AI-powered savings recommendations
   - Historical spending trends

---

## 📦 Setup Instructions

### Step 1: Install Dependencies (if not done)
```bash
npm install
```

### Step 2: Configure Environment
Ensure your `.env` file has these variables:
```env
DATABASE_URL="your_database_url"
DIRECT_URL="your_direct_database_url"
JWT_SECRET="your_jwt_secret"
PAYSTACK_SECRET_KEY="your_paystack_key"
PAYSTACK_PUBLIC_KEY="your_paystack_public_key"
FRONTEND_URL="http://localhost:3000"
```

### Step 3: Setup Database

**Option A: Using the setup script (recommended)**
```bash
./setup-database.sh
```

**Option B: Manual setup**
```bash
npm run prisma:generate
npm run prisma:migrate
npm run build
```

### Step 4: Start Development Server
```bash
npm run start:dev
```

The API will be available at `http://localhost:3000`

---

## 🎯 Quick Test

### 1. Register a User
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123",
    "username": "testuser"
  }'
```

### 2. Login
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response.

### 3. Create a Beneficiary
```bash
curl -X POST http://localhost:3000/beneficiaries \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Test Beneficiary",
    "accountNumber": "0123456789",
    "bankCode": "058",
    "bankName": "GTBank"
  }'
```

### 4. Get Spending Insights
```bash
curl -X GET http://localhost:3000/insights/spending?period=month \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📚 Documentation

- **[API_DOCUMENTATION.md](./API_DOCUMENTATION.md)** - Complete API reference with all endpoints
- **[IMPROVEMENTS_SUMMARY.md](./IMPROVEMENTS_SUMMARY.md)** - Detailed breakdown of all features
- **[FEATURES_CHECKLIST.md](./FEATURES_CHECKLIST.md)** - Implementation status tracker
- **[MIGRATION_INSTRUCTIONS.md](./MIGRATION_INSTRUCTIONS.md)** - Database setup guide

---

## 🔑 Key Endpoints

### Bill Payments
```
POST   /bills                     - Create bill
GET    /bills                     - List bills
POST   /bills/:id/pay             - Pay from wallet
POST   /bills/:id/pay-transfer    - Pay via bank transfer ⭐
```

### Beneficiaries
```
POST   /beneficiaries             - Create beneficiary ⭐
GET    /beneficiaries             - List all
DELETE /beneficiaries/:id         - Remove beneficiary
```

### Financial Goals
```
POST   /financial-goals           - Create goal ⭐
GET    /financial-goals           - List goals
POST   /financial-goals/:id/contribute - Add funds
```

### Insights
```
GET    /insights/spending         - Spending analysis ⭐
GET    /insights/trends           - Historical trends ⭐
GET    /insights/recommendations  - Savings tips ⭐
```

---

## 🤖 Automated Features

The following tasks run automatically:

1. **Bill Reminders** (Daily 8:00 AM)
   - Notifies users of bills due today

2. **Auto-Pay Bills** (Daily 9:00 AM)
   - Automatically pays bills with autopay enabled
   - Supports both wallet and transfer payments

3. **Recurring Expenses** (Daily 12:00 AM)
   - Creates expenses from recurring schedules
   - Updates next due dates

---

## 🎨 Frontend Integration Tips

### Authentication
```typescript
// Store token after login
const { access_token } = await login(email, password);
localStorage.setItem('token', access_token);

// Use in requests
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

### Bill Payment Flow
```typescript
// 1. Create beneficiary
const beneficiary = await createBeneficiary({
  name: 'Electricity Company',
  accountNumber: '0123456789',
  bankCode: '058',
  bankName: 'GTBank'
});

// 2. Create bill with beneficiary
const bill = await createBill({
  amount: 5000,
  description: 'Electricity',
  dueDate: '2025-11-05',
  beneficiaryId: beneficiary.id
});

// 3. Pay bill
const payment = await payBillWithTransfer(bill.id);
```

### Display Insights
```typescript
// Get spending breakdown
const insights = await getSpendingInsights('month');

// Show chart
const chartData = insights.topCategories.map(cat => ({
  name: cat.category,
  value: cat.amount,
  percentage: cat.percentage
}));

// Show recommendations
const recommendations = await getRecommendations();
recommendations.forEach(rec => {
  showNotification(rec.message, rec.priority);
});
```

---

## 🐛 Troubleshooting

### Build Fails with Prisma Errors
**Problem:** TypeScript errors about missing Prisma models

**Solution:**
```bash
npm run prisma:generate
npm run build
```

### Database Connection Error
**Problem:** Can't connect to database

**Solution:**
1. Check `.env` has correct `DATABASE_URL` and `DIRECT_URL`
2. Ensure database server is running
3. Test connection: `npx prisma db push`

### Paystack Transfers Not Working
**Problem:** Transfers fail or account verification fails

**Solution:**
1. Verify `PAYSTACK_SECRET_KEY` is correct
2. Use test keys for development
3. Check Paystack dashboard for API status
4. Ensure bank codes are correct (use `/paystack/banks` endpoint)

### Cron Jobs Not Running
**Problem:** Automated tasks not executing

**Solution:**
1. Ensure `@nestjs/schedule` is imported in AppModule
2. Check server logs for errors
3. Verify date-fns is installed: `npm install date-fns`

---

## 📞 Need Help?

1. Check the **API_DOCUMENTATION.md** for endpoint details
2. Review **IMPROVEMENTS_SUMMARY.md** for feature explanations
3. Look at **MIGRATION_INSTRUCTIONS.md** for examples
4. Check application logs for error details

---

## 🎉 Next Steps

1. ✅ Setup complete - Database migrated
2. 🔄 Build your frontend
3. 🧪 Write tests for new features
4. 📊 Monitor Paystack webhooks
5. 🚀 Deploy to production

---

## 💡 Pro Tips

1. **Use beneficiaries** for recurring bill payments
2. **Enable autopay** for bills you want automated
3. **Set financial goals** to stay motivated
4. **Check insights weekly** for spending optimization
5. **Create recurring expenses** for predictable costs
6. **Review recommendations** for personalized savings tips

---

## 🔐 Security Notes

- All bank accounts are verified before transfers
- Webhooks validate Paystack signatures
- Wallet balance is checked before payments
- All endpoints require JWT authentication
- Passwords are hashed with bcrypt

---

**Ready to build your frontend? All backend features are ready to go! 🚀**

For detailed API documentation, see [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
