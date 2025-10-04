import { Module, forwardRef } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { WalletController } from './wallet.controller';
import { UsersModule } from '../user/user.module';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackModule } from '../pay-stack/pay-stack.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [forwardRef(() => UsersModule), PaystackModule, NotificationsModule],
  providers: [WalletService, PrismaService],
  controllers: [WalletController],
  exports: [WalletService],
})
export class WalletModule {}