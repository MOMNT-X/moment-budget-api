import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import axios from 'axios';
import twilio from 'twilio';

@Injectable()
export class NotificationsService {
  sendBudgetAlert(arg0: { userId: string; categoryId: string; PercentageUsed: number; remaining: number; }) {
    throw new Error('Method not implemented.');
  }
  private readonly logger = new Logger(NotificationsService.name);
  private readonly discordWebhookUrl =
    'https://discord.com/api/webhooks/1423866861984157706/uFh0ITXT9ztrQpU3Dr_LchPkzpeOscG9DqDq3irOW-kQAGAQMw9BmNooij06pCnI0b6h';
  private readonly sendgridApiKey = process.env.SENDGRID_API_KEY;
  private readonly sendFrom =
    process.env.SENDGRID_FROM_EMAIL || 'noreply@smartbudget.com';
  
  private readonly twilioClient: twilio.Twilio;

  constructor(private readonly http: HttpService) {
    this.twilioClient = twilio(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );}
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

  async sendNotification(options: {
    type: 'EMAIL' | 'DISCORD' | 'SMS';
    to?: string;
    subject?: string;
    html?: string;
    message?: string;
    embed?: any;
  }) {
    if (options.type === 'EMAIL') {
      return this.sendEmail(options.to!, options.subject!, options.html!);
    }
    if (options.type === 'DISCORD') {
      return this.sendDiscordNotification(options.message!, options.embed);
    }
    if (options.type === 'SMS') {
      return this.sendSMS(options.to!, options.message!);
    }
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

  async sendSMS(to: string, message: string) {
    try{
      await this.twilioClient.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to,
      });
      this.logger.log(`SMS sent to ${to}`);
    } catch (error) {
      this.logger.log('SMS sending failed', error.message);
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
    const amount = budget.amount.toFixed(2);
    const spent = budget.spent.toFixed(2);
    
    // Determine alert level
    let alertLevel = '';
    let alertColor = 0xffaa00; // Orange for warning
    let emoji = '⚠️';
    
    if (percentUsed >= 100) {
      alertLevel = 'EXCEEDED';
      alertColor = 0xff0000; // Red
      emoji = '🚨';
    } else if (percentUsed >= 95) {
      alertLevel = 'CRITICAL';
      alertColor = 0xff4500; // Dark orange
      emoji = '⚠️';
    } else if (percentUsed >= 80) {
      alertLevel = 'WARNING';
      alertColor = 0xffaa00; // Orange
      emoji = '⚠️';
    }

    // Email notification
    const html = `
      <h2 style="color: ${percentUsed >= 95 ? '#ff0000' : '#ff6600'};">
        ${emoji} Budget Alert: ${alertLevel}
      </h2>
      <p>Hello ${user.firstName || user.username},</p>
      <p>You've used <strong>${percentUsed.toFixed(1)}%</strong> of your budget for <strong>${budget.category.name}</strong>.</p>
      <ul>
        <li>Budget Amount: ₦${amount}</li>
        <li>Amount Spent: ₦${spent}</li>
        <li>Remaining: ₦${(budget.amount - budget.spent).toFixed(2)}</li>
      </ul>
      <p style="color: #666;">
        ${percentUsed >= 100 
          ? 'You have exceeded your budget limit. Please review your spending.' 
          : percentUsed >= 95 
          ? 'You are very close to your budget limit. Immediate action recommended!' 
          : 'Please monitor your spending to stay within budget.'}
      </p>
    `;

    await this.sendEmail(
      user.email,
      `Smart Budget: ${alertLevel} - Budget Usage Alert`,
      html,
    );

    // SMS notification (if user has phone number)
    if (user.phone) {
      const smsMessage = `${emoji} Smart Budget Alert: You've used ${percentUsed.toFixed(1)}% of your ${budget.category.name} budget (₦${spent} of ₦${amount}). ${
        percentUsed >= 100 
          ? 'Budget exceeded!' 
          : percentUsed >= 95 
          ? 'Critical level!' 
          : 'Monitor your spending.'
      }`;
      
      await this.sendSMS(user.phone, smsMessage);
    }

    // Discord notification
    await this.sendDiscordNotification(
      `${emoji} Budget Alert - ${user.username}`,
      {
        color: alertColor,
        title: `${alertLevel}: ${budget.category.name} Budget`,
        fields: [
          { name: 'User', value: user.username, inline: true },
          { name: 'Percentage Used', value: `${percentUsed.toFixed(1)}%`, inline: true },
          { name: 'Status', value: alertLevel, inline: true },
          { name: 'Budget', value: `₦${amount}`, inline: true },
          { name: 'Spent', value: `₦${spent}`, inline: true },
          { name: 'Remaining', value: `₦${(budget.amount - budget.spent).toFixed(2)}`, inline: true },
        ],
        timestamp: new Date().toISOString(),
      },
    );
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
