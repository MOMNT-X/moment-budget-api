import { Controller, Post, Body, Req, BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  private getUser(req: any) {
    const user = req.user;
    if (!user || !user.email) {
      throw new BadRequestException('Invalid or missing authenticated user');
    }
    return user;
  }

  // --- 1️⃣ Send a simple email ---
  @Post('email')
  async sendEmail(
    @Body() body: { to: string; subject: string; html: string },
    @Req() req,
  ) {
    if (!body.to || !body.subject || !body.html)
      throw new BadRequestException('Missing email fields');

    await this.notificationsService.sendEmail(body.to, body.subject, body.html);
    return { status: 'success', message: 'Email sent successfully' };
  }

  // --- 2️⃣ Send a Discord notification ---
  @Post('discord')
  async sendDiscord(@Body() body: { message: string; embed?: any }) {
    if (!body.message)
      throw new BadRequestException(
        'Message is required for Discord notification',
      );

    await this.notificationsService.sendDiscordNotification(
      body.message,
      body.embed,
    );
    return { status: 'success', message: 'Discord notification sent' };
  }

  // --- 3️⃣ Send transaction notification ---
  @Post('transaction')
  async transactionNotify(@Body() body: { transaction: any }, @Req() req) {
    const user = this.getUser(req);
    if (!body.transaction)
      throw new BadRequestException('Transaction details are required');

    await this.notificationsService.sendTransactionNotification(
      user,
      body.transaction,
    );
    return { status: 'success', message: 'Transaction notification sent' };
  }

  // --- 4️⃣ Send budget created notification ---
  @Post('budget-created')
  async budgetCreated(@Body() body: { budget: any }, @Req() req) {
    const user = this.getUser(req);
    if (!body.budget) throw new BadRequestException('Budget data is required');

    await this.notificationsService.sendBudgetCreatedNotification(
      user,
      body.budget,
    );
    return { status: 'success', message: 'Budget created notification sent' };
  }

  // --- 5️⃣ Send budget threshold alert ---
  @Post('budget-threshold')
  async budgetThreshold(
    @Body() body: { budget: any; percentUsed: number },
    @Req() req,
  ) {
    const user = this.getUser(req);
    if (!body.budget || typeof body.percentUsed !== 'number')
      throw new BadRequestException('Budget and percentUsed are required');

    await this.notificationsService.sendBudgetThresholdAlert(
      user,
      body.budget,
      body.percentUsed,
    );
    return { status: 'success', message: 'Budget threshold alert sent' };
  }

  // --- 6️⃣ Send bill paid notification ---
  @Post('bill-paid')
  async billPaid(@Body() body: { bill: any }, @Req() req) {
    const user = this.getUser(req);
    if (!body.bill) throw new BadRequestException('Bill data is required');

    await this.notificationsService.sendBillPaidNotification(user, body.bill);
    return { status: 'success', message: 'Bill paid notification sent' };
  }

  // --- 7️⃣ Send bill reminder ---
  @Post('bill-reminder')
  async billReminder(@Body() body: { bill: any }, @Req() req) {
    const user = this.getUser(req);
    if (!body.bill) throw new BadRequestException('Bill data is required');

    await this.notificationsService.sendBillReminderNotification(
      user,
      body.bill,
    );
    return { status: 'success', message: 'Bill reminder sent' };
  }

  @Post('test-email')
  async testEmail(@Body() body: { to: string }) {
    return this.notificationsService.sendEmail(
      body.to,
      '✅ Test Email from Smart Budget',
      '<h1>This is a test email from Smart Budget App</h1><p>You have successfully integrated SendGrid!</p>',
    );
  }
}
