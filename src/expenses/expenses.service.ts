import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FilterExpenseDto } from './dto/filter-expense.dto';
import { PaginateQuery } from 'nestjs-paginate';
import { generateReference } from 'src/utils/reference.util';

@Injectable()
export class ExpenseService {
  constructor(private readonly prisma: PrismaService) {}

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

    const expense = await this.prisma.expense.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId,
      },
    });

    await this.prisma.wallet.update({
      where: { userId },
      data: {
        balance: { decrement: dto.amount },
      },
    });

    await this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        categoryId: dto.categoryId,
        type: 'EXPENSE',
        reference: generateReference(),
      },
    });

    return expense;
  }

  async getExpenses(query: PaginateQuery, dto?: FilterExpenseDto) {
    const filters: any = {};

    if (dto?.category) {
      filters.category = dto.category;
    }

    if (dto?.minAmount || dto?.maxAmount) {
      filters.amount = {};
      if (dto.minAmount) filters.amount.gte = dto.minAmount;
      if (dto.maxAmount) filters.amount.lte = dto.maxAmount;
    }

    if (dto?.month) {
      const [year, month] = dto.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filters.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.prisma.expense.findMany({
        where: filters,
        orderBy: { timestamp: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.expense.count({ where: filters }),
    ]);

    return {
      items,
      meta: {
        totalItems: total,
        itemCount: items.length,
        itemsPerPage: limit,
        totalPages: Math.ceil(total / limit),
        currentPage: page,
      },
    };
  }

  async findUserExpenses(userId: string, dto: FilterExpenseDto) {
    const filters: any = {
      userId,
    };

    if (dto.category) {
      filters.category = dto.category;
    }

    if (dto.minAmount || dto.maxAmount) {
      filters.amount = {};
      if (dto.minAmount) filters.amount.gte = dto.minAmount;
      if (dto.maxAmount) filters.amount.lte = dto.maxAmount;
    }

    if (dto.month) {
      const [year, month] = dto.month.split('-').map(Number);
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0, 23, 59, 59);
      filters.timestamp = {
        gte: startDate,
        lte: endDate,
      };
    }

    return this.prisma.expense.findMany({
      where: filters,
      orderBy: { timestamp: 'desc' },
    });
  }
}
