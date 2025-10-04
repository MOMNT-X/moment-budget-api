import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';
import { BillStatus } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class BillService {
  private readonly logger = new Logger(BillService.name);

  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
    private notificationService: NotificationsService,
  ) {}

  async createBill(userId: string, dto: any) {
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
        await this.payBill(bill.userId, bill.id);
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