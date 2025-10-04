import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './user/user.module';
import { IncomeModule } from './income/income.module';
import { BudgetModule } from './budget/budget.module';
import { ExpenseModule } from './expenses/expenses.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoryModule } from './categories/categories.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { SummaryModule } from './summary/summary.module';
import { WalletModule } from './wallet/wallet.module';
import { PaystackModule } from './pay-stack/pay-stack.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { BillsController } from './bills/bills.controller';
import { BillsModule } from './bills/bills.module';
import { NotificationsModule } from './notifications/notifications.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { FinancialGoalsModule } from './financial-goals/financial-goals.module';
import { RecurringExpensesModule } from './recurring-expenses/recurring-expenses.module';
import { InsightsModule } from './insights/insights.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    AuthModule,
    UsersModule,
    IncomeModule,
    BudgetModule,
    ExpenseModule,
    TransactionsModule,
    CategoryModule,
    ReportsModule,
    PrismaModule,
    SummaryModule,
    WalletModule,
    PaystackModule,
    HttpModule.register({
      timeout: 10000,
    }),
    DashboardModule,
    BillsModule,
    NotificationsModule,
    BeneficiariesModule,
    FinancialGoalsModule,
    RecurringExpensesModule,
    InsightsModule,
  ],
  controllers: [AppController, BillsController],
  providers: [AppService],
})
export class AppModule {}
