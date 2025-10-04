import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { v4 as uuidv4 } from 'uuid';
import { BillStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';
import { generateReference } from '../utils/reference.util';
import { PayBillTransferDto } from './dto/pay-bill-transfer.dto';
import { CreateBillDto } from './dto/create-bill.dto';

@Injectable()
export class BillService {
  private readonly logger = new Logger(BillService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificationService: NotificationsService,
    private paystack: PaystackService,
  ) {}

  async createBill(userId: string, dto: CreateBillDto) {
    const now = new Date();
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { category: true },
    });

    if (!budget) {
      throw new BadRequestException(
        'No active budget found for this category. Please create a budget first.'
      );
    }

    const amountKobo = dto.amount * 100;
    const spent = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        categoryId: dto.categoryId,
        timestamp: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
    });

    const alreadySpent = spent._sum.amount || 0;
    const budgetAmount = budget.amount * 100;

    if (alreadySpent + amountKobo > budgetAmount) {
      throw new BadRequestException(
        `Bill amount exceeds budget. Budget: ₦${budget.amount}, Spent: ₦${alreadySpent / 100}, Bill: ₦${dto.amount}`
      );
    }

    return this.prisma.bill.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: amountKobo,
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        autoPay: dto.autoPay || false,
        reference: uuidv4(),
        paidAt: new Date(0),
        billStatus: BillStatus.PENDING,
        currency: 'NGN',
        recipientAccountNumber: dto.recipientAccountNumber,
        recipientAccountName: dto.recipientAccountName,
        recipientBankCode: dto.recipientBankCode,
        recipientBankName: dto.recipientBankName,
        beneficiaryId: dto.beneficiaryId,
      },
      include: { category: true },
    });
  }

  async getBills(userId: string, status?: 'PENDING' | 'OVERDUE' | 'PAID') {
    const now = new Date();
    let where: any = { userId };

    if (status === 'PENDING') {
      where = {
        ...where,
        billStatus: BillStatus.PENDING,
        dueDate: { gte: now },
      };
    } else if (status === 'OVERDUE') {
      where = {
        ...where,
        billStatus: BillStatus.PENDING,
        dueDate: { lt: now },
      };
    } else if (status === 'PAID') {
      where = { ...where, billStatus: BillStatus.PAID };
    }

    return this.prisma.bill.findMany({
      where,
      include: { category: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async payBill(userId: string, billId: string) {
    const bill = await this.prisma.bill.findUnique({ 
      where: { id: billId },
      include: { category: true },
    });
    
    if (!bill || bill.userId !== userId) {
      throw new NotFoundException('Bill not found');
    }
    
    if (bill.billStatus === BillStatus.PAID) {
      throw new BadRequestException('Bill already paid');
    }

    await this.walletService.pay(userId, {
      amount: bill.amount / 100,
      categoryId: bill.categoryId,
      description: `Bill Payment: ${bill.description}`,
    });

    const updatedBill = await this.prisma.bill.update({
      where: { id: billId },
      data: { billStatus: BillStatus.PAID, paidAt: new Date() },
      include: { category: true },
    });

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    await this.notificationService.sendBillPaidNotification(user, updatedBill);

    return { message: 'Bill paid successfully', bill: updatedBill };
  }

  async payBillWithTransfer(userId: string, billId: string, dto?: PayBillTransferDto) {
    const bill = await this.prisma.bill.findUnique({
      where: { id: billId },
      include: { category: true, beneficiary: true },
    });

    if (!bill || bill.userId !== userId) {
      throw new NotFoundException('Bill not found');
    }

    if (bill.billStatus === BillStatus.PAID) {
      throw new BadRequestException('Bill already paid');
    }

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < bill.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    let recipientAccountNumber: string;
    let recipientBankCode: string;
    let recipientBankName: string;
    let recipientCode: string | undefined;

    if (dto?.beneficiaryId) {
      const beneficiary = await this.prisma.beneficiary.findFirst({
        where: { id: dto.beneficiaryId, userId },
      });

      if (!beneficiary) {
        throw new NotFoundException('Beneficiary not found');
      }

      recipientAccountNumber = beneficiary.accountNumber;
      recipientBankCode = beneficiary.bankCode;
      recipientBankName = beneficiary.bankName;
      recipientCode = beneficiary.paystackRecipientCode || undefined;
    } else if (bill.beneficiaryId && bill.beneficiary) {
      recipientAccountNumber = bill.beneficiary.accountNumber;
      recipientBankCode = bill.beneficiary.bankCode;
      recipientBankName = bill.beneficiary.bankName;
      recipientCode = bill.beneficiary.paystackRecipientCode || undefined;
    } else if (dto?.recipientAccountNumber && dto?.recipientBankCode && dto?.recipientBankName) {
      recipientAccountNumber = dto.recipientAccountNumber;
      recipientBankCode = dto.recipientBankCode;
      recipientBankName = dto.recipientBankName;
    } else if (bill.recipientAccountNumber && bill.recipientBankCode && bill.recipientBankName) {
      recipientAccountNumber = bill.recipientAccountNumber;
      recipientBankCode = bill.recipientBankCode;
      recipientBankName = bill.recipientBankName;
      recipientCode = bill.paystackRecipientCode || undefined;
    } else {
      throw new BadRequestException(
        'No recipient details provided. Please provide bank account details or select a beneficiary.'
      );
    }

    if (!recipientCode) {
      const resolvedAccount = await this.paystack.resolveAccountNumber(
        recipientAccountNumber,
        recipientBankCode,
      );

      if (!resolvedAccount || !resolvedAccount.account_name) {
        throw new BadRequestException(
          'Could not verify recipient account details. Please check the account number and bank code.'
        );
      }

      const recipient = await this.paystack.createTransferRecipient({
        type: 'nuban',
        name: resolvedAccount.account_name,
        bank_code: recipientBankCode,
        account_number: recipientAccountNumber,
      });

      recipientCode = recipient.recipient_code;

      await this.prisma.bill.update({
        where: { id: billId },
        data: {
          recipientAccountNumber,
          recipientAccountName: resolvedAccount.account_name,
          recipientBankCode,
          recipientBankName,
          paystackRecipientCode: recipientCode,
        },
      });
    }

    const reference = generateReference();
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        amount: bill.amount,
        description: `Bill Payment: ${bill.description}`,
        type: 'TRANSFER',
        categoryId: bill.categoryId,
        reference,
        status: 'pending',
      },
    });

    try {
      const transfer = await this.paystack.initiateTransfer({
        amountKobo: bill.amount,
        recipientCode,
        reason: `Bill Payment: ${bill.description}`,
        reference,
      });

      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId },
          data: { balance: { decrement: bill.amount } },
        }),
        this.prisma.expense.create({
          data: {
            userId,
            amount: bill.amount,
            description: `Bill Payment: ${bill.description}`,
            categoryId: bill.categoryId,
          },
        }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: {
            status: 'processing',
            metadata: {
              transferCode: transfer.transfer_code,
              transferId: transfer.id,
              recipient: recipientAccountNumber,
              bank: recipientBankName,
            },
          },
        }),
        this.prisma.bill.update({
          where: { id: billId },
          data: { billStatus: BillStatus.PAID, paidAt: new Date() },
        }),
      ]);

      await this.notificationService.sendEmail(
        user.email,
        'Bill Payment Initiated',
        `
          <h2>Bill Payment Processing</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Your bill payment has been initiated and is being processed.</p>
          <ul>
            <li><strong>Bill:</strong> ${bill.description}</li>
            <li><strong>Amount:</strong> ₦${(bill.amount / 100).toFixed(2)}</li>
            <li><strong>Recipient:</strong> ${recipientAccountNumber} (${recipientBankName})</li>
            <li><strong>Reference:</strong> ${reference}</li>
          </ul>
          <p>The payment will be processed within 24 hours.</p>
        `,
      );

      return {
        message: 'Bill payment initiated successfully',
        reference,
        amount: bill.amount / 100,
        status: 'processing',
        estimatedCompletion: '24 hours',
      };
    } catch (error) {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'failed' },
      });

      throw new BadRequestException(
        `Payment failed: ${error.message || 'Please try again later'}`,
      );
    }
  }

  @Cron('0 8 * * *')
  async checkDueBillsDaily() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueBills = await this.prisma.bill.findMany({
      where: {
        billStatus: BillStatus.PENDING,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { category: true, user: true },
    });

    for (const bill of dueBills) {
      await this.notificationService.sendBillReminderNotification(
        bill.user,
        bill
      );
    }

    this.logger.log(`Sent reminders for ${dueBills.length} bills due today`);
  }

  @Cron('0 9 * * *')
  async autoPayBills() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const autoPayBills = await this.prisma.bill.findMany({
      where: {
        billStatus: BillStatus.PENDING,
        autoPay: true,
        dueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { category: true },
    });

    for (const bill of autoPayBills) {
      try {
        if (bill.recipientAccountNumber || bill.beneficiaryId) {
          await this.payBillWithTransfer(bill.userId, bill.id);
        } else {
          await this.payBill(bill.userId, bill.id);
        }
        this.logger.log(`Auto-paid bill ${bill.id} for user ${bill.userId}`);
      } catch (error) {
        this.logger.error(`Failed to auto-pay bill ${bill.id}:`, error.message);
        
        const user = await this.prisma.user.findUnique({ 
          where: { id: bill.userId } 
        });
        
        if (user) {
          await this.notificationService.sendEmail(
            user.email,
            'Auto-Payment Failed',
            `
              <h2>Auto-Payment Failed</h2>
              <p>Hello ${user.firstName || user.username},</p>
              <p>We couldn't process auto-payment for: ${bill.description}</p>
              <p><strong>Reason:</strong> ${error.message}</p>
            `
          );
        }
      }
    }

    this.logger.log(`Processed ${autoPayBills.length} auto-pay bills`);
  }
}