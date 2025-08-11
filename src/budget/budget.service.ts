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
}
