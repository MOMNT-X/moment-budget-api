// src/expense/expense.service.ts
import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';

@Injectable()
export class ExpenseService {
  constructor(private prisma: PrismaService) {}

  async createExpense(userId: string, dto: CreateExpenseDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < dto.amount) {
      throw new ForbiddenException('Insufficient wallet balance');
    }

    const now = new Date();
    const activeBudget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!activeBudget) {
      throw new ForbiddenException('No active budget for this category');
    }

    // Optionally, fetch total expenses in this category for the current period
    const totalSpent = await this.prisma.expense.aggregate({
      where: {
        userId,
        categoryId: dto.categoryId,
        timestamp: {
          gte: activeBudget.startDate,
          lte: activeBudget.endDate,
        },
      },
      _sum: { amount: true },
    });

    const spentSoFar = totalSpent._sum.amount ?? 0;
    if (spentSoFar + dto.amount > activeBudget.amount) {
      throw new ForbiddenException('Budget exceeded for this category');
    }

    // Record the expense
    const expense = await this.prisma.expense.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId,
      },
    });

    // Deduct from wallet
    await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: dto.amount },
      },
    });

    // Add to transaction log
    await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId,
        type: 'EXPENSE',
      },
    });

    return expense;
  }
}
