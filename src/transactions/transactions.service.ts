import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { TransactionType } from '@prisma/client';
import { transcode } from 'buffer';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackService: PaystackService,
  ) {}

  /**
   * Creates a Paystack payment intent and stores a 'pending' transaction.
   * dto.amount is assumed to be in NAIRA here; convert to KOBO for storage + Paystack.
   * If your DTO is already KOBO, drop the *100.
   */
  async create(userId: string, dto: CreateTransactionDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.email) throw new BadRequestException('User email is required');

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    const amountKobo = dto.amount * 100;

    const init = await this.paystackService.initializePayment({
      amountKobo,
      email: user.email,
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
        amount: amountKobo, // store kobo
        reference: init.data.reference,
        description: dto.description,
        type: dto.type as TransactionType, // must match your Prisma enum
        status: 'pending',
      },
    });

    return {
      paymentUrl: init.data.authorization_url,
      reference: init.data.reference,
    };
  }

  async autoConfirmPayment(payload: any) {
    const { reference, status, amount, customer } = payload.data;

    // Ensure amount is in kobo (Paystack webhook sends kobo by default)
    const amountKobo = amount;

    // Find transaction by reference
    let transaction = await this.prisma.transaction.findUnique({
      where: { reference },
    });

    if (!transaction) {
      // If transaction does not exist, create one for the user
      const user = await this.prisma.user.findUnique({
        where: { email: customer.email },
      });

      if (!user) {
        throw new BadRequestException(`No user found for ${customer.email}`);
      }

      transaction = await this.prisma.transaction.create({
        data: {
          reference,
          userId: user.id,
          amount: amountKobo,
          status: status === 'success' ? 'success' : 'failed',
          type: 'DEPOSIT',
        },
      });
    } else {
      // Update transaction status if it exists
      transaction = await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: status === 'success' ? 'success' : 'failed' },
      });
    }

    // If successful, credit wallet
    if (status === 'success') {
      await this.prisma.wallet.update({
        where: { userId: transaction.userId },
        data: { balance: { increment: transaction.amount } },
      });
    }

    return transaction;
  }

  async confirmPayment(reference: string) {
    const verified = await this.paystackService.verifyPayment(reference);

    const existing = await this.prisma.transaction.findFirst({
      where: { reference },
    });
    if (!existing)
      throw new BadRequestException('Transaction not found for reference');

    if (verified.status === 'success') {
      const updated = await this.prisma.transaction.update({
        where: { id: existing.id }, // use unique ID
        data: { status: 'success' },
      });

      // Adjust wallet after success
      if (updated.type === 'INCOME') {
        await this.prisma.wallet.update({
          where: { userId: updated.userId },
          data: { balance: { increment: updated.amount } }, // kobo
        });
      } else if (updated.type === 'EXPENSE') {
        await this.prisma.wallet.update({
          where: { userId: updated.userId },
          data: { balance: { decrement: updated.amount } },
        });
      }

      return updated;
    } else {
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
}
