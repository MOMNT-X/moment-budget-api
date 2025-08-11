import { Module } from '@nestjs/common';
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

@Module({
  imports: [
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
