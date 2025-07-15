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

@Module({
  imports: [AuthModule, UserModule, IncomeModule, BudgetModule, ExpensesModule, TransactionsModule, CategoriesModule, ReportsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
