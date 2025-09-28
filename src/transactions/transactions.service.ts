import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Create a new Paystack payment intent and store a "pending" transaction.
   */
  async create(userId: string, email: string, dto: CreateTransactionDto) {
    if (!email) throw new BadRequestException('User email is required');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const amountKobo = dto.amount * 100;

    const init = await this.paystackService.initializePayment({
      amountKobo,
      email,
      subaccountCode: wallet?.paystackSubaccountCode,
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
   * Manual verification (used if you want to confirm explicitly from frontend).
   */
  async confirmPayment(reference: string) {
    const verified = await this.paystackService.verifyPayment(reference);

    const existing = await this.prisma.transaction.findFirst({
      where: { reference },
    });
    if (!existing)
      throw new BadRequestException('Transaction not found for reference');

    if (verified.status === 'success') {
      const updated = await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'success' },
      });

      // Adjust wallet after success
      await this.adjustWallet(updated);

      return updated;
    } else {
      return this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * Auto verification from Paystack webhook.
   */
  async autoConfirm(reference: string) {
    const existing = await this.prisma.transaction.findFirst({
      where: { reference },
    });
    if (!existing) return;

    // Idempotency: prevent double-crediting
    if (existing.status === 'success') return;

    const verified = await this.paystackService.verifyPayment(reference);

    if (verified.status === 'success') {
      const updated = await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'success' },
      });

      // Adjust wallet after success
      await this.adjustWallet(updated);

      return updated;
    } else {
      await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
    }
  }

  /**
   * Adjusts user wallet based on transaction type.
   */
  private async adjustWallet(transaction: any) {
    if (transaction.type === 'INCOME') {
      await this.prisma.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: { increment: transaction.amount } }, // still in kobo
      });
    } else if (transaction.type === 'EXPENSE') {
      await this.prisma.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: { decrement: transaction.amount } },
      });
    }
  }

  /**
   * List user transactions with filters.
   */
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

  /**
   * Get all transactions + user details.
   */
  async findAllUsers(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { user: true },
    });
  }
}
