import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);
  private readonly discordWebhookUrl =
    'https://discord.com/api/webhooks/1423866861984157706/uFh0ITXT9ztrQpU3Dr_LchPkzpeOscG9DqDq3irOW-kQAGAQMw9BmNooij06pCnI0b6h';
  private readonly sendgridApiKey = process.env.SENDGRID_API_KEY;
  private readonly sendFrom =
    process.env.SENDGRID_FROM_EMAIL || 'noreply@smartbudget.com';

  constructor(private readonly http: HttpService) {}

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private wrapEmailContent(preheader: string, htmlContent: string): string {
    return `
      <span style="display:none; visibility:hidden; opacity:0; height:0; width:0; overflow:hidden;">
        ${preheader}
      </span>

      ${htmlContent}

      <hr />
      <p style="font-size: 12px; color: #999;">
        Smart Budget App<br />
        123 Budget Street, Lagos, Nigeria<br />
        Contact us: support@smartbudget.com
      </p>
    `;
  }

  async sendEmail(to: string, subject: string, html: string) {
    const plainText = this.stripHtml(html);
    const fullHtml = this.wrapEmailContent(subject, html);

    try {
      await axios.post(
        'https://api.sendgrid.com/v3/mail/send',
        {
          personalizations: [
            {
              to: [{ email: to }],
              subject,
            },
          ],
          from: { email: this.sendFrom, name: 'Smart Budget App' },
          content: [
            { type: 'text/plain', value: plainText },
            { type: 'text/html', value: fullHtml },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${this.sendgridApiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );
      this.logger.log(`Email sent to ${to}`);
    } catch (error) {
      this.logger.error(
        'Email sending failed',
        error.response?.data || error.message,
      );
    }
  }

  async sendDiscordNotification(message: string, embed?: any) {
    try {
      const payload: any = { content: message };
      if (embed) payload.embeds = [embed];
      await firstValueFrom(this.http.post(this.discordWebhookUrl, payload));
      this.logger.log('Discord notification sent');
    } catch (error) {
      this.logger.error('Discord notification failed', error);
    }
  }

  async sendTransactionNotification(user: any, transaction: any) {
    const amount = (transaction.amount / 100).toFixed(2);
    const html = `
      <h2>Transaction Confirmation</h2>
      <p>Hello ${user.firstName || user.username},</p>
      <p>Your ${transaction.type.toLowerCase()} transaction was successful.</p>
      <ul>
        <li>Amount: ₦${amount}</li>
        <li>Type: ${transaction.type}</li>
        <li>Description: ${transaction.description}</li>
        <li>Date: ${new Date(transaction.timestamp).toLocaleString()}</li>
      </ul>
    `;

    await this.sendEmail(
      user.email,
      `Smart Budget: ${transaction.type} Transaction`,
      html,
    );

    await this.sendDiscordNotification(
      `💰 New Transaction - ${user.username}`,
      {
        color: transaction.type === 'INCOME' ? 0x00ff00 : 0xff0000,
        title: `${transaction.type} Transaction`,
        fields: [
          { name: 'User', value: user.username, inline: true },
          { name: 'Amount', value: `₦${amount}`, inline: true },
          { name: 'Type', value: transaction.type, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    );
  }

  async sendBudgetCreatedNotification(user: any, budget: any) {
    const amount = budget.amount.toFixed(2);
    const html = `
      <h2>Budget Created</h2>
      <p>Hello ${user.firstName || user.username},</p>
      <ul>
        <li>Category: ${budget.category.name}</li>
        <li>Amount: ₦${amount}</li>
        <li>Period: ${new Date(budget.startDate).toLocaleDateString()} - ${new Date(
          budget.endDate,
        ).toLocaleDateString()}</li>
      </ul>
    `;

    await this.sendEmail(user.email, 'Smart Budget: New Budget Created', html);

    await this.sendDiscordNotification(`📊 New Budget - ${user.username}`, {
      color: 0x0099ff,
      title: 'Budget Created',
      fields: [
        { name: 'User', value: user.username, inline: true },
        { name: 'Category', value: budget.category.name, inline: true },
        { name: 'Amount', value: `₦${amount}`, inline: true },
      ],
    });
  }

  async sendBudgetThresholdAlert(user: any, budget: any, percentUsed: number) {
    const html = `
      <h2>Budget Alert</h2>
      <p>Hello ${user.firstName || user.username},</p>
      <p>You've used ${percentUsed.toFixed(1)}% of your budget for <strong>${budget.category.name}</strong>.</p>
    `;
    await this.sendEmail(user.email, 'Smart Budget: Budget Usage Alert', html);
  }

  async sendBillPaidNotification(user: any, bill: any) {
    const amount = (bill.amount / 100).toFixed(2);
    const html = `
      <h2>Bill Payment Confirmation</h2>
      <p>Hello ${user.firstName || user.username},</p>
      <ul>
        <li>Description: ${bill.description}</li>
        <li>Amount: ₦${amount}</li>
      </ul>
    `;
    await this.sendEmail(
      user.email,
      'Smart Budget: Bill Payment Successful',
      html,
    );
  }

  async sendBillReminderNotification(user: any, bill: any) {
    const amount = (bill.amount / 100).toFixed(2);
    const html = `
      <h2>Bill Reminder</h2>
      <p>Hello ${user.firstName || user.username},</p>
      <ul>
        <li>Description: ${bill.description}</li>
        <li>Amount: ₦${amount}</li>
      </ul>
    `;
    await this.sendEmail(user.email, 'Smart Budget: Bill Due Reminder', html);
  }
}
