import { Module } from '@nestjs/common';
import { PaystackService } from './pay-stack.service';
import { PayStackController } from './pay-stack.controller';

@Module({
  controllers: [PayStackController],
  providers: [PaystackService],
  exports: [PaystackService],
})
export class PaystackModule {}
