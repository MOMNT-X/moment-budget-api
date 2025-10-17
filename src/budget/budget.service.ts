import { Injectable, ConflictException, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';
import { addDays, addWeeks, addMonths } from 'date-fns';

@Injectable()
export class BudgetService {
  constructor(private prisma: PrismaService) {}

  async create(userId: string, dto: CreateBudgetDto) {
    // Check if there's already an active budget for this category
    const existingBudget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        endDate: { gte: new Date() }, // Active budget (not ended yet)
      },
      include: {
        category: true,
      },
    });

    if (existingBudget) {
      throw new ConflictException({
        message: `An active budget for "${existingBudget.category.name}" already exists`,
        existingBudget: {
          id: existingBudget.id,
          amount: existingBudget.amount,
          startDate: existingBudget.startDate,
          endDate: existingBudget.endDate,
          recurring: existingBudget.recurring,
          frequency: existingBudget.frequency,
        },
      });
    }

    // Calculate next run date if recurring
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
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: {
        category: true,
      },
    });
  }

  // NEW: Update existing budget
  async update(budgetId: string, userId: string, dto: UpdateBudgetDto) {
    // Check if budget exists and belongs to user
    const existingBudget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
      include: { category: true },
    });

    if (!existingBudget) {
      throw new NotFoundException('Budget not found');
    }

    if (existingBudget.userId !== userId) {
      throw new BadRequestException('You can only update your own budgets');
    }

    // If changing category, check for conflicts
    if (dto.categoryId && dto.categoryId !== existingBudget.categoryId) {
      const conflictingBudget = await this.prisma.budget.findFirst({
        where: {
          userId,
          categoryId: dto.categoryId,
          endDate: { gte: new Date() },
          id: { not: budgetId }, // Exclude current budget
        },
        include: { category: true },
      });

      if (conflictingBudget) {
        throw new ConflictException({
          message: `An active budget for "${conflictingBudget.category.name}" already exists`,
          existingBudget: {
            id: conflictingBudget.id,
            amount: conflictingBudget.amount,
            startDate: conflictingBudget.startDate,
            endDate: conflictingBudget.endDate,
          },
        });
      }
    }

    // Calculate next run date if recurring settings changed
    let nextRunDate: Date | null = existingBudget.nextRunDate;
    const recurring = dto.recurring ?? existingBudget.recurring;
    const frequency = dto.frequency ?? existingBudget.frequency;
    const endDate = dto.endDate ? new Date(dto.endDate) : existingBudget.endDate;

    if (recurring && frequency) {
      const base = endDate;
      switch (frequency) {
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
    } else {
      nextRunDate = null;
    }

    return this.prisma.budget.update({
      where: { id: budgetId },
      data: {
        ...dto,
        nextRunDate,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        category: true,
      },
    });
  }

  // NEW: Delete budget
  async delete(budgetId: string, userId: string) {
    const budget = await this.prisma.budget.findUnique({
      where: { id: budgetId },
    });

    if (!budget) {
      throw new NotFoundException('Budget not found');
    }

    if (budget.userId !== userId) {
      throw new BadRequestException('You can only delete your own budgets');
    }

    return this.prisma.budget.delete({
      where: { id: budgetId },
    });
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

    // Convert totalSpent from kobo → naira
    const totalSpentNaira = totalSpent / 100;

    // 3. Remaining
    const remaining = totalBudget - totalSpentNaira;

    // 4. Determine budget status
    const status = totalSpentNaira > totalBudget ? 'overbudget' : 'underbudget';
    const difference = Math.abs(totalBudget - totalSpentNaira);

    // 5. Calculate usage percentage
    const percentageUsed =
      totalBudget > 0 ? (totalSpentNaira / totalBudget) * 100 : 0;

    // 6. Return combined summary + status
    return {
      totalBudget,
      totalSpent: totalSpentNaira,
      remaining,
      status,
      difference,
      percentageUsed: Number(percentageUsed.toFixed(2)),
      message:
        status === 'overbudget'
          ? `You have exceeded your budget by ₦${difference.toFixed(2)}`
          : `You are within your budget, ₦${difference.toFixed(2)} remaining`,
    };
  }
}
