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

  async confirmPayment(reference: string) {
    const verified = await this.paystackService.verifyPayment(reference);
    const existing = await this.prisma.transaction.findFirst({ where: { reference } });

    if (!existing) throw new BadRequestException('Transaction not found for reference');

    if (verified.status === 'success') {
      const updated = await this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'success' },
      });

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

      return updated;
    } else {
      return this.prisma.transaction.update({
        where: { id: existing.id },
        data: { status: 'failed' },
      });
    }
  }

  // ✅ findAll with flexible date filtering + sorting
  async findAll(userId: string, filters: FilterTransactionDto) {
    const {
      type,
      minAmount,
      maxAmount,
      startDate,
      endDate,
      sortBy,
      sortOrder,
    } = filters;

    const where: any = {
      userId,
      ...(type && { type }),
      ...(minAmount && { amount: { gte: minAmount * 100 } }),
      ...(maxAmount && { amount: { lte: maxAmount * 100 } }),
    };

    // ✅ Flexible date filtering logic
    if (startDate && endDate) {
      where.timestamp = { gte: new Date(startDate), lte: new Date(endDate) };
    } else if (startDate) {
      where.timestamp = { gte: new Date(startDate) };
    } else if (endDate) {
      where.timestamp = { lte: new Date(endDate) };
    }

    const orderByField = sortBy || 'timestamp';
    const orderDirection = sortOrder === 'asc' ? 'asc' : 'desc';

    return this.prisma.transaction.findMany({
      where,
      orderBy: { [orderByField]: orderDirection },
    });
  }

  async findAllUsers(userId: string) {
    return this.prisma.transaction.findMany({
      where: { userId },
      include: { user: true },
    });
  }
}
