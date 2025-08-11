import { Module } from '@nestjs/common';
import { ExpenseService } from './expenses.service';
import { ExpenseController } from './expenses.controller';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService],
})
export class ExpenseModule {}
