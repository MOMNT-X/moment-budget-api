# Database Migration Instructions

## Important: Database Setup Required

The new features added to this project require database schema changes. Before the application can build and run properly, you need to run the Prisma migrations.

### Prerequisites

Ensure your `.env` file has the correct database connection strings:

```env
DATABASE_URL="your_prisma_accelerate_url_or_direct_postgres_url"
DIRECT_URL="your_direct_postgres_connection_url"
```

### Running the Migration

1. **Generate Prisma Client:**
   ```bash
   npx prisma generate
   ```

2. **Create and Apply Migration:**
   ```bash
   npx prisma migrate dev --name add_bill_transfers_beneficiaries_goals
   ```

   This will:
   - Create a new migration file
   - Apply the schema changes to your database
   - Generate the updated Prisma Client with new models

3. **Verify the Migration:**
   ```bash
   npx prisma studio
   ```

   This opens Prisma Studio where you can verify the new tables:
   - Beneficiary
   - FinancialGoal
   - RecurringExpense
   - Updated Bill table with recipient details

### New Database Models Added

1. **Beneficiary** - Stores saved bank account recipients for recurring payments
2. **FinancialGoal** - Tracks savings goals with progress monitoring
3. **RecurringExpense** - Manages automated recurring expense tracking
4. **Bill Updates** - Added recipient bank account details and beneficiary linking

### After Migration

Once the migration is complete, run:

```bash
npm run build
```

The project should build successfully with all new features enabled.

## New Features Added

### 1. Bill Payment with Paystack Transfers
- Pay bills directly to bank accounts via Paystack
- Verify recipient account details before payment
- Track transfer status and history
- **Endpoint:** `POST /bills/:id/pay-transfer`

### 2. Beneficiary Management
- Save frequently used payment recipients
- Auto-verify account details via Paystack
- Link beneficiaries to bills for faster payments
- **Endpoints:**
  - `POST /beneficiaries` - Create new beneficiary
  - `GET /beneficiaries` - List all beneficiaries
  - `GET /beneficiaries/:id` - Get beneficiary details
  - `PATCH /beneficiaries/:id` - Update beneficiary
  - `DELETE /beneficiaries/:id` - Remove beneficiary

### 3. Financial Goals
- Set savings targets with deadlines
- Track progress automatically
- Link goals to budget categories
- **Endpoints:**
  - `POST /financial-goals` - Create goal
  - `GET /financial-goals` - List goals
  - `GET /financial-goals/:id` - Get goal details
  - `PATCH /financial-goals/:id` - Update goal
  - `POST /financial-goals/:id/contribute` - Add funds to goal
  - `DELETE /financial-goals/:id` - Remove goal

### 4. Recurring Expenses
- Automate recurring expense tracking
- Supports daily, weekly, monthly, yearly frequencies
- Automatic expense creation on due dates
- **Endpoints:**
  - `POST /recurring-expenses` - Create recurring expense
  - `GET /recurring-expenses` - List recurring expenses
  - `GET /recurring-expenses/:id` - Get details
  - `PATCH /recurring-expenses/:id` - Update
  - `DELETE /recurring-expenses/:id` - Remove

### 5. Spending Insights & Analytics
- View spending breakdown by category
- Track spending trends over time
- Get budget performance metrics
- Receive AI-powered savings recommendations
- **Endpoints:**
  - `GET /insights/spending?period=week|month|year` - Spending analysis
  - `GET /insights/trends?months=6` - Historical trends
  - `GET /insights/budget-performance` - Budget vs actual
  - `GET /insights/recommendations` - Smart savings tips

## Cron Jobs Added

The following automated tasks run daily:

1. **Bill Reminders** (8:00 AM) - Sends notifications for bills due today
2. **Auto-Pay Bills** (9:00 AM) - Automatically pays bills with autopay enabled
3. **Recurring Expenses** (12:00 AM) - Creates expenses from recurring schedules

## Testing the New Features

### Example: Pay a Bill via Bank Transfer

```bash
# Create a bill with recipient details
POST /bills
{
  "categoryId": "cat_123",
  "amount": 5000,
  "description": "Electricity Bill",
  "dueDate": "2025-11-01",
  "recipientAccountNumber": "0123456789",
  "recipientBankCode": "058",
  "recipientBankName": "GTBank"
}

# Pay the bill with transfer
POST /bills/{bill_id}/pay-transfer
{
  // Uses bill's saved recipient details
}
```

### Example: Track a Financial Goal

```bash
# Create a savings goal
POST /financial-goals
{
  "name": "Emergency Fund",
  "targetAmount": 100000,
  "deadline": "2025-12-31",
  "categoryId": "savings_cat_id"
}

# Add contribution
POST /financial-goals/{goal_id}/contribute
{
  "amount": 10000
}
```

### Example: Get Spending Insights

```bash
# Get current month insights
GET /insights/spending?period=month

# Get savings recommendations
GET /insights/recommendations
```
