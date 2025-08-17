import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TransactionsService } from './transactions.service';
import { TransactionsController } from './transactions.controller';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { PaystackModule } from '../pay-stack/pay-stack.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
    forwardRef(() => PaystackModule),
  ],
  controllers: [TransactionsController],
  providers: [TransactionsService, PaystackService],
  exports: [TransactionsService],
})
export class TransactionsModule {}
