import { Module, forwardRef } from '@nestjs/common';
import { PaystackService } from './pay-stack.service';
import { PaystackController } from './pay-stack.controller';
import { HttpModule } from '@nestjs/axios';
import { TransactionsModule } from '../transactions/transactions.module';

@Module({
  imports: [
    HttpModule.register({
      timeout: 10000,
    }),
    forwardRef(() => TransactionsModule),
  ],
  controllers: [PaystackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
