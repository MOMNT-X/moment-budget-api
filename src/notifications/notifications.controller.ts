import { Controller, Post, Body } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('test-email')
  async testEmail(@Body() body: { to: string }) {
    return this.notificationsService.sendEmail(
      body.to,
      '✅ Test Email from Smart Budget',
      '<h1>This is a test email from Smart Budget App</h1><p>You have successfully integrated SendGrid!</p>',
    );
  }
}
