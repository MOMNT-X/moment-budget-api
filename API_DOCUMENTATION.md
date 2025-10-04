# Moment Budget API Documentation

## Base URL
```
http://localhost:3000
```

## Authentication
All endpoints (except auth endpoints) require JWT authentication via Bearer token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

---

## 🔐 Authentication

### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "username": "johndoe",
  "firstName": "John",
  "lastName": "Doe"
}
```

### Login
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

## 💰 Wallet Management

### Get Wallet Balance
```http
GET /wallet/balance
```

### Create Wallet
```http
POST /wallet/create
Content-Type: application/json

{
  "email": "user@example.com",
  "businessName": "John Doe",
  "bankCode": "058",
  "accountNumber": "0123456789"
}
```

### Deposit to Wallet
```http
POST /wallet/deposit
Content-Type: application/json

{
  "amount": 10000,
  "email": "user@example.com"
}

Response:
{
  "authorizationUrl": "https://checkout.paystack.com/...",
  "reference": "ref_123456"
}
```

### Confirm Deposit
```http
POST /wallet/confirm-deposit
Content-Type: application/json

{
  "reference": "ref_123456"
}
```

### Withdraw from Wallet
```http
POST /wallet/withdraw
Content-Type: application/json

{
  "amount": 5000
}
```

---

## 💳 Bill Payments

### Create Bill
```http
POST /bills
Content-Type: application/json

{
  "categoryId": "cat_123",
  "amount": 5000,
  "description": "Electricity Bill",
  "dueDate": "2025-11-01",
  "autoPay": false,
  "recipientAccountNumber": "0123456789",
  "recipientBankCode": "058",
  "recipientBankName": "GTBank",
  "beneficiaryId": "ben_123" // Optional, use saved beneficiary
}
```

### Get All Bills
```http
GET /bills
GET /bills?status=PENDING
GET /bills?status=OVERDUE
GET /bills?status=PAID
```

### Pay Bill (from wallet)
```http
POST /bills/:billId/pay
```

### Pay Bill with Bank Transfer
```http
POST /bills/:billId/pay-transfer
Content-Type: application/json

{
  "recipientAccountNumber": "0123456789", // Optional if bill has recipient
  "recipientBankCode": "058",
  "recipientBankName": "GTBank",
  "beneficiaryId": "ben_123" // Optional, override with beneficiary
}
```

---

## 👥 Beneficiary Management

### Create Beneficiary
```http
POST /beneficiaries
Content-Type: application/json

{
  "name": "Electricity Company",
  "accountNumber": "0123456789",
  "bankCode": "058",
  "bankName": "GTBank"
}
```

### Get All Beneficiaries
```http
GET /beneficiaries
```

### Get Beneficiary
```http
GET /beneficiaries/:id
```

### Update Beneficiary
```http
PATCH /beneficiaries/:id
Content-Type: application/json

{
  "name": "Updated Name"
}
```

### Delete Beneficiary
```http
DELETE /beneficiaries/:id
```

---

## 🎯 Financial Goals

### Create Financial Goal
```http
POST /financial-goals
Content-Type: application/json

{
  "name": "Emergency Fund",
  "targetAmount": 100000,
  "deadline": "2025-12-31",
  "categoryId": "cat_savings" // Optional
}
```

### Get All Goals
```http
GET /financial-goals
GET /financial-goals?status=ACTIVE
GET /financial-goals?status=COMPLETED
```

### Get Goal Details
```http
GET /financial-goals/:id

Response:
{
  "id": "goal_123",
  "name": "Emergency Fund",
  "targetAmount": 100000,
  "currentAmount": 35000,
  "progress": 35.00,
  "remaining": 65000,
  "status": "ACTIVE"
}
```

### Update Goal
```http
PATCH /financial-goals/:id
Content-Type: application/json

{
  "name": "Updated Goal Name",
  "targetAmount": 150000,
  "status": "PAUSED"
}
```

### Contribute to Goal
```http
POST /financial-goals/:id/contribute
Content-Type: application/json

{
  "amount": 10000
}
```

### Delete Goal
```http
DELETE /financial-goals/:id
```

---

## 🔁 Recurring Expenses

### Create Recurring Expense
```http
POST /recurring-expenses
Content-Type: application/json

{
  "amount": 15000,
  "description": "Monthly Rent",
  "categoryId": "cat_housing",
  "frequency": "MONTHLY",
  "nextDueDate": "2025-11-01",
  "endDate": "2026-12-31", // Optional
  "isActive": true
}

Frequency options: DAILY, WEEKLY, MONTHLY, YEARLY
```

### Get All Recurring Expenses
```http
GET /recurring-expenses
GET /recurring-expenses?activeOnly=false
```

### Get Recurring Expense
```http
GET /recurring-expenses/:id
```

### Update Recurring Expense
```http
PATCH /recurring-expenses/:id
Content-Type: application/json

{
  "amount": 16000,
  "isActive": false
}
```

### Delete Recurring Expense
```http
DELETE /recurring-expenses/:id
```

---

## 📊 Spending Insights & Analytics

### Get Spending Insights
```http
GET /insights/spending?period=month

Query parameters:
- period: week | month | year

Response:
{
  "period": "month",
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "totalSpent": 45000,
  "transactionCount": 23,
  "averageTransaction": 1956.52,
  "topCategories": [
    {
      "category": "Food",
      "amount": 15000,
      "percentage": 33.33,
      "count": 8
    }
  ],
  "byCategory": [...]
}
```

### Get Spending Trends
```http
GET /insights/trends?months=6

Response:
[
  {
    "month": "May 2025",
    "totalSpent": 42000,
    "transactionCount": 20
  },
  {
    "month": "Jun 2025",
    "totalSpent": 38000,
    "transactionCount": 18
  }
]
```

### Get Budget Performance
```http
GET /insights/budget-performance

Response:
[
  {
    "category": "Food",
    "budgetAmount": 20000,
    "spent": 15000,
    "remaining": 5000,
    "percentUsed": 75.00,
    "status": "healthy"
  },
  {
    "category": "Transport",
    "budgetAmount": 10000,
    "spent": 12000,
    "remaining": 0,
    "percentUsed": 120.00,
    "status": "exceeded"
  }
]

Status values: healthy | warning | exceeded
```

### Get Savings Recommendations
```http
GET /insights/recommendations

Response:
[
  {
    "type": "high_spending_category",
    "priority": "high",
    "message": "You're spending 45% of your budget on Food. Consider reducing expenses in this category.",
    "category": "Food",
    "amount": 18000
  },
  {
    "type": "budget_exceeded",
    "priority": "high",
    "message": "You've exceeded 2 budget(s). Review your spending in: Transport, Entertainment",
    "categories": ["Transport", "Entertainment"]
  }
]

Recommendation types:
- high_spending_category
- budget_exceeded
- budget_warning
- spending_increase
```

---

## 📝 Budget Management

### Create Budget
```http
POST /budget
Content-Type: application/json

{
  "categoryId": "cat_food",
  "amount": 20000,
  "startDate": "2025-10-01",
  "endDate": "2025-10-31",
  "recurring": false
}
```

### Get All Budgets
```http
GET /budget
```

### Get Budget by ID
```http
GET /budget/:id
```

### Update Budget
```http
PATCH /budget/:id
Content-Type: application/json

{
  "amount": 25000
}
```

### Delete Budget
```http
DELETE /budget/:id
```

---

## �� Expense Management

### Create Expense
```http
POST /expenses
Content-Type: application/json

{
  "amount": 5000,
  "description": "Grocery shopping",
  "categoryId": "cat_food"
}
```

### Get All Expenses
```http
GET /expenses
GET /expenses?categoryId=cat_food
GET /expenses?startDate=2025-10-01&endDate=2025-10-31
```

### Update Expense
```http
PATCH /expenses/:id
Content-Type: application/json

{
  "amount": 5500,
  "description": "Updated description"
}
```

### Delete Expense
```http
DELETE /expenses/:id
```

---

## 🏷️ Category Management

### Create Category
```http
POST /categories
Content-Type: application/json

{
  "name": "Custom Category"
}
```

### Get All Categories
```http
GET /categories
```

### Update Category
```http
PATCH /categories/:id
Content-Type: application/json

{
  "name": "Updated Category Name"
}
```

### Delete Category
```http
DELETE /categories/:id
```

---

## 📊 Dashboard & Summary

### Get Dashboard Summary
```http
GET /dashboard

Response:
{
  "totalIncome": 100000,
  "totalExpenses": 45000,
  "walletBalance": 55000,
  "budgetSummary": [...],
  "recentTransactions": [...]
}
```

### Get Summary
```http
GET /summary?period=month

Query parameters:
- period: week | month | year
```

---

## 🔔 Automated Features

### Cron Jobs

The following automated tasks run daily:

1. **Bill Reminders** (8:00 AM)
   - Sends email notifications for bills due today

2. **Auto-Pay Bills** (9:00 AM)
   - Automatically pays bills with `autoPay: true`
   - Uses bank transfer if recipient details are set

3. **Recurring Expenses** (12:00 AM)
   - Creates expenses from active recurring expense schedules
   - Updates next due date based on frequency

---

## 🏦 Paystack Integration

### Get Banks List
```http
GET /paystack/banks?country=NG
```

### Verify Account Number
The API automatically verifies account numbers when:
- Creating beneficiaries
- Paying bills with new recipient details
- This ensures valid bank account details before transfers

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "statusCode": 400,
  "message": "Error description",
  "error": "Bad Request"
}
```

Common status codes:
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing or invalid token)
- `404` - Not Found
- `500` - Internal Server Error

---

## Webhook Endpoints

### Paystack Transfer Webhook
```http
POST /paystack/webhook/transfer

Handles transfer status updates from Paystack
- Updates transaction status
- Sends email notifications
- Refunds wallet on failed transfers
```

---

## Best Practices

1. **Always verify wallet balance** before initiating transfers
2. **Use beneficiaries** for recurring payments to save time
3. **Set up recurring expenses** for automated tracking
4. **Enable autoPay** for bills you want automatically paid
5. **Check insights regularly** for spending optimization tips
6. **Set financial goals** to stay motivated and track progress
7. **Create budgets** before creating bills to ensure spending limits

---

## Example Workflow: Bill Payment

1. Create a beneficiary (one-time):
```http
POST /beneficiaries
{ "name": "Power Company", "accountNumber": "...", "bankCode": "058", "bankName": "GTBank" }
```

2. Create a bill with beneficiary:
```http
POST /bills
{ "amount": 5000, "description": "Electricity", "dueDate": "2025-11-05", "beneficiaryId": "ben_123" }
```

3. Pay bill via transfer:
```http
POST /bills/:billId/pay-transfer
```

4. Webhook updates transaction status automatically
5. Email confirmation sent to user

---

## Support

For issues or questions:
- Check logs for detailed error messages
- Ensure environment variables are properly configured
- Verify database migrations are up to date
- Check Paystack dashboard for payment issues
