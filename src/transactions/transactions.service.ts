import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

@Injectable()
export class TransactionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateTransactionDto) {
    const data = {
      ...dto,
      userId,
      amount: dto.amount,
      categoryId: dto.categoryId ?? null,
    };

    // Optionally: Update wallet for income/expense
    if (dto.type === 'INCOME') {
      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: { increment: dto.amount } },
      });
    } else if (dto.type === 'EXPENSE') {
      const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
      if (!wallet || wallet.balance < dto.amount) {
        throw new NotFoundException('Insufficient balance');
      }

      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: dto.amount } },
      });
    }

    return this.prisma.transaction.create({ data });
  }

  async findAll(userId: string, filters: FilterTransactionDto) {
    const { type, minAmount, maxAmount, startDate, endDate } = filters;

    return this.prisma.transaction.findMany({
      where: {
        userId,
        ...(type && { type }),
        ...(minAmount && { amount: { gte: minAmount } }),
        ...(maxAmount && { amount: { lte: maxAmount } }),
        ...(startDate &&
          endDate && {
            timestamp: {
              gte: new Date(startDate),
              lte: new Date(endDate),
            },
          }),
      },
      orderBy: { timestamp: 'desc' },
    });
  }
}
