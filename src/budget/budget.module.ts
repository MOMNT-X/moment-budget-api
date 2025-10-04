import { Module } from '@nestjs/common';
import { BudgetService } from './budget.service';
import { BudgetController } from './budget.controller';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  controllers: [BudgetController],
  providers: [BudgetService, PrismaService],
  imports: [NotificationsModule],
  exports: [BudgetService]
})
export class BudgetModule {}
