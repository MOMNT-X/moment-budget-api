import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfWeek,
  endOfWeek,
  startOfYear,
  endOfYear,
} from 'date-fns';

export interface Trend {
  month: string;
  totalSpent: number;
  transactionCount: number;
}

@Injectable()
export class InsightsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSpendingInsights(
    userId: string,
    period: 'week' | 'month' | 'year' = 'month',
  ) {
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    switch (period) {
      case 'week':
        startDate = startOfWeek(now);
        endDate = endOfWeek(now);
        break;
      case 'year':
        startDate = startOfYear(now);
        endDate = endOfYear(now);
        break;
      default:
        startDate = startOfMonth(now);
        endDate = endOfMonth(now);
    }

    const expenses = await this.prisma.expense.findMany({
      where: {
        userId,
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { category: true },
    });

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);

    const byCategory = expenses.reduce(
      (acc, exp) => {
        const categoryName = exp.category?.name || 'Uncategorized';
        if (!acc[categoryName]) {
          acc[categoryName] = { amount: 0, count: 0, percentage: 0 };
        }
        acc[categoryName].amount += exp.amount;
        acc[categoryName].count += 1;
        return acc;
      },
      {} as Record<string, { amount: number; count: number; percentage: number }>,
    );

    Object.keys(byCategory).forEach((category) => {
      byCategory[category].percentage =
        totalSpent > 0
          ? Math.round((byCategory[category].amount / totalSpent) * 10000) / 100
          : 0;
    });

    const sortedCategories = Object.entries(byCategory)
      .sort(([, a], [, b]) => b.amount - a.amount)
      .slice(0, 5);

    return {
      period,
      startDate,
      endDate,
      totalSpent: totalSpent / 100,
      transactionCount: expenses.length,
      averageTransaction:
        expenses.length > 0 ? totalSpent / expenses.length / 100 : 0,
      topCategories: sortedCategories.map(([name, data]) => ({
        category: name,
        amount: data.amount / 100,
        percentage: data.percentage,
        count: data.count,
      })),
      byCategory: Object.entries(byCategory).map(([name, data]) => ({
        category: name,
        amount: data.amount / 100,
        percentage: data.percentage,
        count: data.count,
      })),
    };
  }

  async getSpendingTrends(userId: string, months = 6) {
    const trends: Trend[] = []; // ✅ fixed typing
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const date = subMonths(now, i);
      const startDate = startOfMonth(date);
      const endDate = endOfMonth(date);

      const expenses = await this.prisma.expense.aggregate({
        _sum: { amount: true },
        _count: true,
        where: {
          userId,
          timestamp: {
            gte: startDate,
            lte: endDate,
          },
        },
      });

      trends.unshift({
        month: date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric',
        }),
        totalSpent: (expenses._sum.amount || 0) / 100,
        transactionCount: expenses._count,
      });
    }

    return trends;
  }

  async getBudgetPerformance(userId: string) {
    const now = new Date();

    const budgets = await this.prisma.budget.findMany({
      where: {
        userId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: { category: true },
    });

    const performance = await Promise.all(
      budgets.map(async (budget) => {
        const spent = await this.prisma.expense.aggregate({
          _sum: { amount: true },
          where: {
            userId,
            categoryId: budget.categoryId,
            timestamp: {
              gte: budget.startDate,
              lte: budget.endDate,
            },
          },
        });

        const spentAmount = spent._sum.amount || 0;
        const budgetAmountKobo = budget.amount * 100;
        const percentUsed =
          budgetAmountKobo > 0
            ? Math.round((spentAmount / budgetAmountKobo) * 10000) / 100
            : 0;

        return {
          category: budget.category?.name,
          budgetAmount: budget.amount,
          spent: spentAmount / 100,
          remaining: Math.max((budgetAmountKobo - spentAmount) / 100, 0),
          percentUsed,
          status:
            percentUsed >= 100
              ? 'exceeded'
              : percentUsed >= 80
              ? 'warning'
              : 'healthy',
        };
      }),
    );

    return performance;
  }

  async getSavingsRecommendations(userId: string) {
    const insights = await this.getSpendingInsights(userId, 'month');
    const budgetPerformance = await this.getBudgetPerformance(userId);

    const recommendations: Array<{
      type: string;
      priority: string;
      message: string;
      category?: string;
      amount?: number;
      categories?: string[];
      increase?: number;
    }> = [];

    if (insights.topCategories.length > 0) {
      const topCategory = insights.topCategories[0];
      if (topCategory.percentage > 40) {
        recommendations.push({
          type: 'high_spending_category',
          priority: 'high',
          message: `You're spending ${topCategory.percentage}% of your budget on ${topCategory.category}. Consider reducing expenses in this category.`,
          category: topCategory.category,
          amount: topCategory.amount,
        });
      }
    }

    const exceededBudgets = budgetPerformance.filter(
      (b) => b.status === 'exceeded',
    );
    if (exceededBudgets.length > 0) {
      recommendations.push({
        type: 'budget_exceeded',
        priority: 'high',
        message: `You've exceeded ${exceededBudgets.length} budget(s). Review your spending in: ${exceededBudgets
          .map((b) => b.category)
          .join(', ')}`,
        categories: exceededBudgets.map((b) => b.category),
      });
    }

    const warningBudgets = budgetPerformance.filter(
      (b) => b.status === 'warning',
    );
    if (warningBudgets.length > 0) {
      recommendations.push({
        type: 'budget_warning',
        priority: 'medium',
        message: `You're close to exceeding ${warningBudgets.length} budget(s). Be cautious with: ${warningBudgets
          .map((b) => b.category)
          .join(', ')}`,
        categories: warningBudgets.map((b) => b.category),
      });
    }

    const trends = await this.getSpendingTrends(userId, 3);
    if (trends.length >= 3) {
      const lastMonth = trends[trends.length - 1].totalSpent;
      const prevMonth = trends[trends.length - 2].totalSpent;

      if (lastMonth > prevMonth * 1.2) {
        const increase = Math.round(
          ((lastMonth - prevMonth) / prevMonth) * 100,
        );
        recommendations.push({
          type: 'spending_increase',
          priority: 'medium',
          message: `Your spending increased by ${increase}% last month. Consider reviewing recent expenses.`,
          increase,
        });
      }
    }

    return recommendations;
  }
}
