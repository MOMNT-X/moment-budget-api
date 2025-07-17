import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { IncomeModule } from './income/income.module';
import { BudgetModule } from './budget/budget.module';
import { ExpensesModule } from './expenses/expenses.module';
import { TransactionsModule } from './transactions/transactions.module';
import { CategoriesModule } from './categories/categories.module';
import { ReportsModule } from './reports/reports.module';
import { PrismaModule } from './prisma/prisma.module';
import { SummaryModule } from './summary/summary.module';
import { WalletModule } from './wallet/wallet.module';

@Module({
  imports: [AuthModule, UserModule, IncomeModule, BudgetModule, ExpensesModule, TransactionsModule, CategoriesModule, ReportsModule, PrismaModule, SummaryModule, WalletModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
