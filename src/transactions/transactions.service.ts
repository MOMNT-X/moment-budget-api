import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { BudgetService } from '../budget/budget.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
    private readonly budgetService: BudgetService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Creates a Paystack payment intent and stores a 'pending' transaction.
   * dto.amount is assumed to be in NAIRA here; convert to KOBO for storage + Paystack.
   */
  async create(userId: string, email: string, dto: CreateTransactionDto) {
    if (!email) throw new BadRequestException('User email is required');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const amountKobo = dto.amount * 100;

    const init = await this.paystackService.initializePayment({
      amountKobo,
      email,
      subaccountCode: wallet?.paystackSubaccountCode || undefined,
      metadata: {
        userId,
        intent: 'generic_transaction',
        categoryId: dto.categoryId,
      },
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        categoryId: dto.categoryId ?? null,
        amount: amountKobo,
        reference: init.data.reference,
        description: dto.description,
        type: dto.type as TransactionType,
        status: 'pending',
      },
    });

    return {
      paymentUrl: init.data.authorization_url,
      reference: init.data.reference,
    };
  }

  /**
   * Confirm payment and update budget if it's an EXPENSE
   * THIS IS WHERE THE BUDGET ALERT MAGIC HAPPENS! 🎯
   */
  async confirmPayment(reference: string) {
    const verified = await this.paystackService.verifyPayment(reference);

    const existing = await this.prisma.transaction.findFirst({
      where: { reference },
    });
    
    if (!existing) {
      throw new BadRequestException('Transaction not found for reference');
    }

    if (verified.status === 'success') {
      // 1. Update transaction status to success
      const updated = await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'success' },
      });

      // 2. Adjust wallet balance
      if (updated.type === 'INCOME') {
        await this.prisma.wallet.update({
          where: { userId: updated.userId },
          data: { balance: { increment: updated.amount } },
        });
      } else if (updated.type === 'EXPENSE') {
        await this.prisma.wallet.update({
          where: { userId: updated.userId },
          data: { balance: { decrement: updated.amount } },
        });
      }

      // 3. Get user for notification
      const user = await this.prisma.user.findUnique({
        where: { id: updated.userId },
      });

      // 4. Send transaction notification
      await this.notificationsService.sendTransactionNotification(
        user,
        updated,
      );

      // 🎯 5. NEW - Check budget and send alerts if EXPENSE
      if (updated.type === 'EXPENSE' && updated.categoryId) {
        await this.budgetService.updateBudgetSpent(
          updated.categoryId,
          updated.userId,
          updated.amount,
        );
      }

      return updated;
    } else {
      // Payment failed
      return this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
    }
  }

  async findAll(userId: string, filters: FilterTransactionDto) {
    const { type, minAmount, maxAmount, startDate, endDate } = filters;
    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(type && { type: type as any }),
        ...(minAmount && { amount: { gte: minAmount } }),
        ...(maxAmount && { amount: { lte: maxAmount } }),
        ...(startDate &&
          endDate && {
            timestamp: { gte: new Date(startDate), lte: new Date(endDate) },
          }),
      },
      orderBy: { timestamp: 'desc' },
    });
  }

  async findAllUsers(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { user: true },
    });
  }

  async getUserTransactions(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
    });
  }
}