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

  async findOneExpense(userId: string, expenseId: string) {
    return this.prisma.expense.findFirst({
      where: { id: expenseId, userId },
    });
  }

  async getExpensesSummary(
    userId: string,
    filters: { month?: number; week?: number; categoryId?: string },
  ) {
    const { month, week, categoryId } = filters;
    const where: any = { userId, type: 'EXPENSE' };

    if (month) {
      const start = new Date(new Date().getFullYear(), month - 1, 1);
      const end = new Date(new Date().getFullYear(), month, 0, 23, 59, 59);
      where.timestamp = { gte: start, lte: end };
    }

    if (week) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      where.timestamp = { gte: start };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    // ✅ use the built `where` object
    const expenses = await this.prisma.transaction.findMany({
      where,
      include: { category: true },
    });

    const totalExpenses = expenses.reduce((sum, tx) => sum + tx.amount, 0);
    const avgExpense =
      expenses.length > 0 ? totalExpenses / expenses.length : 0;
    const largestExpense =
      expenses.length > 0 ? Math.max(...expenses.map((tx) => tx.amount)) : 0;

    // Group by category
    const categoryMap: Record<
      string,
      { name: string; amount: number; count: number }
    > = {};
    for (const tx of expenses) {
      const catId = tx.categoryId ?? 'uncategorized';
      if (!categoryMap[catId]) {
        categoryMap[catId] = {
          name: tx.category?.name || 'Uncategorized',
          amount: 0,
          count: 0,
        };
      }
      categoryMap[catId].amount += tx.amount;
      categoryMap[catId].count++;
    }

    const categoryBreakdown = Object.entries(categoryMap).map(
      ([id, { name, amount, count }]) => ({
        categoryId: id,
        categoryName: name,
        amount,
        percentage: totalExpenses > 0 ? (amount / totalExpenses) * 100 : 0,
        transactions: count,
      }),
    );

    return {
      totalExpenses,
      avgExpense,
      largestExpense,
      totalTransactions: expenses.length,
      categoryBreakdown,
    };
  }

  private getStartOfISOWeek(week: number, year: number): Date {
    const simple = new Date(year, 0, 1 + (week - 1) * 7);
    const dow = simple.getDay();
    const start = simple;
    if (dow <= 4) start.setDate(simple.getDate() - simple.getDay() + 1);
    else start.setDate(simple.getDate() + 8 - simple.getDay());
    return start;
  }
}
