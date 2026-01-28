import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { addDays, addWeeks, addMonths } from 'date-fns';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class BudgetService {
  private readonly logger = new Logger(BudgetService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}
  async createBudget(userId: string, dto: CreateBudgetDto) {
    const budget = await this.prisma.budget.create({
      data: {
        userId,
        ...dto,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
    });

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    // Send budget created notification
    await this.notificationsService.sendBudgetCreatedNotification(user, budget);

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
  
  async updateBudgetSpent(categoryId: string, userId: string, amount: number) {
    // Find active budget for this category
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        category: true,
        user: true,
      },
    });

    if (!budget) {
      this.logger.log(`No active budget found for category ${categoryId}`);
      return null;
    }

    // Update spent amount
    const updatedBudget = await this.prisma.budget.update({
      where: { id: budget.id },
      data: {
        spent: {
          increment: amount / 100, // Convert kobo to naira
        },
      },
      include: {
        category: true,
        user: true,
      },
    });

    // Check and send alerts
    await this.checkAndNotifyBudgetStatus(updatedBudget);

    return updatedBudget;
  }
 private async checkAndNotifyBudgetStatus(budget: any) {
    if (!budget.amount || budget.amount === 0) return;

    const percentUsed = (budget.spent / budget.amount) * 100;

    // Check if we should send notification
    const shouldNotify = this.shouldSendNotification(budget, percentUsed);

    if (shouldNotify) {
      this.logger.log(
        `Sending budget alert for ${budget.user.username} - ${budget.category.name} (${percentUsed.toFixed(1)}%)`,
      );

      // Send notification through all channels
      await this.notificationsService.sendBudgetThresholdAlert(
        budget.user,
        budget,
        percentUsed,
      );

      // Update last notification time and percentage
      await this.prisma.budget.update({
        where: { id: budget.id },
        data: {
          lastNotificationSent: new Date(),
          lastNotificationPercentage: percentUsed,
        },
      });
    }
  }

  /**
   * Determine if we should send a notification
   */
  private shouldSendNotification(budget: any, currentPercent: number): boolean {
    const thresholds = [80, 95, 100];
    const lastPercent = budget.lastNotificationPercentage || 0;

    // Check if we crossed a new threshold
    for (const threshold of thresholds) {
      if (currentPercent >= threshold && lastPercent < threshold) {
        // Check if we sent notification in last 24 hours
        if (budget.lastNotificationSent) {
          const hoursSinceLastNotification =
            (Date.now() - new Date(budget.lastNotificationSent).getTime()) /
            (1000 * 60 * 60);

          // If less than 24 hours, don't send
          if (hoursSinceLastNotification < 24) {
            return false;
          }
        }
        return true;
      }
    }

    return false;
  }

  /**
   * Manually check all user budgets (useful for testing or cron jobs)
   */
  async checkAllUserBudgets(userId: string) {
    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: new Date() },
        endDate: { gte: new Date() },
      },
      include: {
        category: true,
        user: true,
      },
    });

    for (const budget of budgets) {
      await this.checkAndNotifyBudgetStatus(budget);
    }

    return { checked: budgets.length };
  }
}
