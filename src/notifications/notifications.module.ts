import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService],
  imports: [HttpModule],
  exports: [NotificationsService]
})
export class NotificationsModule {}
