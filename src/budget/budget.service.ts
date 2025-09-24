import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { addDays, addWeeks, addMonths } from 'date-fns';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async createBudget(userId: string, dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });
    return budget;
  }

  async getUserBudgets(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: { userId },
      include: { category: true },
    });
    return budgets;
  }

  async renewRecurringBudgets() {
    const today = new Date();

    const recurringBudgets = await this.prisma.budget.findMany({
      where: {
        recurring: true,
        endDate: { lt: today },
      },
    });

    for (const budget of recurringBudgets) {
      const oneMonthLater = new Date(budget.endDate);
      oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

      await this.prisma.budget.create({
        data: {
          userId: budget.userId,
          categoryId: budget.categoryId,
          amount: budget.amount,
          startDate: budget.endDate,
          endDate: oneMonthLater,
          recurring: true,
        },
      });
    }
  }

  create(dto: CreateBudgetDto, userId: string) {
    let nextRunDate: Date | null = null;

    if (dto.recurring && dto.frequency) {
      const base = new Date(dto.endDate);
      switch (dto.frequency) {
        case 'DAILY':
          nextRunDate = addDays(base, 1);
          break;
        case 'WEEKLY':
          nextRunDate = addWeeks(base, 1);
          break;
        case 'MONTHLY':
          nextRunDate = addMonths(base, 1);
          break;
      }
    }

    return this.prisma.budget.create({
      data: {
        ...dto,
        userId,
        nextRunDate,
      },
    });
  }

  async getBudgetSummary(
    userId: string,
    filters: { month?: number; week?: number; categoryId?: string },
  ) {
    const { month, week, categoryId } = filters;
    const where: any = { userId };

    // Apply category filter if passed
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Apply time filters
    let dateFilter: any = {};
    if (month) {
      const start = new Date(new Date().getFullYear(), month - 1, 1);
      const end = new Date(new Date().getFullYear(), month, 0, 23, 59, 59);
      dateFilter = { gte: start, lte: end };
    }
    if (week) {
      const start = new Date();
      start.setDate(start.getDate() - 7);
      dateFilter = { gte: start };
    }

    // 1. Get total budget (sum of budget amounts)
    const budgets = await this.prisma.budget.findMany({
      where,
      include: { category: true },
    });
    const totalBudget = budgets.reduce((sum, b) => sum + b.amount, 0);

    // 2. Get expenses that fall into the same filters
    const expenses = await this.prisma.transaction.findMany({
      where: { userId, type: 'EXPENSE', timestamp: dateFilter, ...where },
    });
    const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0);

    // 3. Remaining
    const remaining = totalBudget - totalSpent / 100; // convert kobo to naira

    return {
      totalBudget,
      totalSpent,
      remaining,
    };
  }
}
