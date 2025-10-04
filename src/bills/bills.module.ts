import { Module } from '@nestjs/common';
import { BillService } from './bills.service';
import { BillsController } from './bills.controller';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { PaystackModule } from 'src/pay-stack/pay-stack.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [PaystackModule, NotificationsModule],
  controllers: [BillsController],
  providers: [BillService, PrismaService, WalletService],
  exports: [BillService],
})
export class BillsModule {}
