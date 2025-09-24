import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getSummary(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        firstName: true,
        wallet: {
          select: { balance: true },
        },
      },
    });

    const now = new Date();

    // === This week vs last week expenses ===
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // start of this week

    const startOfLastWeek = new Date(startOfWeek);
    startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
    const endOfLastWeek = new Date(startOfWeek);

    const thisWeekExpenses = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        timestamp: { gte: startOfWeek },
      },
      _sum: { amount: true },
    });

    const lastWeekExpenses = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        timestamp: { gte: startOfLastWeek, lt: endOfLastWeek },
      },
      _sum: { amount: true },
    });

    const thisWeekSpent = thisWeekExpenses._sum.amount || 0;
    const lastWeekSpent = lastWeekExpenses._sum.amount || 0;

    let percentageChange = 0;
    if (lastWeekSpent > 0) {
      percentageChange =
        ((thisWeekSpent - lastWeekSpent) / lastWeekSpent) * 100;
    }

    // === Monthly budget (by frequency) ===
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const monthlyBudget = await this.prisma.budget.aggregate({
      where: {
        userId,
        frequency: 'MONTHLY',
        startDate: { lte: now },
        endDate: { gte: now },
      },
      _sum: { amount: true },
    });

    const totalBudget = monthlyBudget._sum.amount || 0;

    // === Monthly expenses ===
    const monthlyExpenses = await this.prisma.transaction.aggregate({
      where: {
        userId,
        type: 'EXPENSE',
        timestamp: { gte: startOfMonth },
      },
      _sum: { amount: true },
    });

    const totalSpent = monthlyExpenses._sum.amount || 0;

    // Remaining budget & progress
    const remainingBudget = totalBudget - totalSpent;
    const budgetProgress =
      totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      userName: user?.firstName || 'User',
      walletBalance: user?.wallet?.balance || 0,
      percentageChange,
      monthlyExpenses: totalSpent,
      monthlyBudget: totalBudget,
      remainingBudget,
      budgetProgress,
    };
  }

  async getTransactions(userId: string, limit: number) {
    return this.prisma.transaction.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        amount: true,
        timestamp: true,
        type: true,
      },
    });
  }

  async getCategoryBreakdown(userId: string, year?: number, month?: number) {
    const now = new Date();
    const safeYear = year ?? now.getFullYear();
    const safeMonth = month ?? now.getMonth() + 1;

    const startDate = new Date(safeYear, safeMonth - 1, 1);
    const endDate = new Date(safeYear, safeMonth, 0);

    const breakdown = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: 'EXPENSE', // must match enum
        timestamp: { gte: startDate, lte: endDate }, // ✅ use timestamp not createdAt
      },
      _sum: { amount: true },
    });

    const total = breakdown.reduce(
      (sum, item) => sum + (item._sum?.amount ?? 0),
      0,
    );

    return Promise.all(
      breakdown.map(async (item) => {
        const category = item.categoryId
          ? await this.prisma.budgetCategory.findUnique({
              where: { id: item.categoryId },
            })
          : null;

        return {
          categoryId: item.categoryId,
          categoryName: category?.name ?? 'Uncategorized',
          total: item._sum?.amount ?? 0,
          percentage: total ? ((item._sum?.amount ?? 0) / total) * 100 : 0,
        };
      }),
    );
  }
  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bankName: true,
        accountNumber: true,
        income: true,
        bankCode: true,
        paystackSubaccount: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
