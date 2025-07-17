// wallet.service.ts
import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { PayDto } from './dto/pay.dto';
import { TransactionType } from '../transactions/entities/transaction.entity';

@Injectable()
export class WalletService {
  constructor(private readonly prisma: PrismaService) {}

  async deposit(userId: string, dto: DepositDto) {
    const wallet = await this.prisma.wallet.upsert({
      where: { userId },
      update: { balance: { increment: dto.amount } },
      create: {
        userId,
        balance: dto.amount,
      },
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description || 'Deposit',
        type: TransactionType.INCOME,
      },
    });

    return { message: 'Deposit successful', balance: wallet.balance };
  }

  async pay(userId: string, dto: PayDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < dto.amount)
      throw new BadRequestException('Insufficient balance');

    // Check if there's an active budget for this category
    const now = new Date();
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });
    if (!budget) throw new BadRequestException('No active budget for this category');

    // Calculate how much has already been spent in this category within this budget window
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
    if (alreadySpent + dto.amount > budget.amount)
      throw new BadRequestException('Budget exceeded for this category');

    // Proceed with payment
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: dto.amount } },
      }),
      this.prisma.expense.create({
        data: {
          userId,
          amount: dto.amount,
          description: dto.description,
          categoryId: dto.categoryId,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          amount: dto.amount,
          description: dto.description,
          type: TransactionType.EXPENSE,
          categoryId: dto.categoryId,
        },
      }),
    ]);

    return { message: 'Payment successful' };
  }
}
