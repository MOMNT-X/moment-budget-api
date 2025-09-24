// summary.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SummaryService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserSummary(userId: string) {
    const [incomeAgg, expenseAgg, wallet, expensesByCategory, activeBudgets] =
      await Promise.all([
        this.prisma.transaction.aggregate({
          where: { userId, type: 'INCOME' },
          _sum: { amount: true },
        }),
        this.prisma.transaction.aggregate({
          where: { userId, type: 'EXPENSE' },
          _sum: { amount: true },
        }),
        this.prisma.wallet.findUnique({ where: { userId } }),
        this.prisma.expense.groupBy({
          by: ['categoryId'],
          where: { userId },
          _sum: { amount: true },
        }),
        this.prisma.budget.findMany({
          where: {
            userId,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
          include: { category: true },
        }),
      ]);

    return {
      income: incomeAgg._sum.amount || 0,
      expenses: expenseAgg._sum.amount || 0,
      balance: wallet?.balance || 0,
      expensesByCategory,
      budgetUtilization: activeBudgets.map((budget) => {
        const spent =
          expensesByCategory.find((e) => e.categoryId === budget.categoryId)
            ?._sum.amount || 0;
        return {
          category: budget.category.name,
          budgeted: budget.amount,
          spent,
          percentUsed: +((spent / budget.amount) * 100).toFixed(2),
        };
      }),
    };
  }
}
