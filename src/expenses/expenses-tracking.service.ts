import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ExpenseTrackingService {
  private readonly logger = new Logger(ExpenseTrackingService.name);

  constructor(
    private prisma: PrismaService,
    private notificationService: NotificationsService,
  ) {}

  @Cron('0 */6 * * *')
  async checkBudgetUsage() {
    const now = new Date();

    const activeBudgets = await this.prisma.budget.findMany({
      where: {
        startDate: { lte: now },
        endDate: { gte: now },
      },
      include: {
        category: true,
        user: true,
      },
    });

    for (const budget of activeBudgets) {
      const spent = await this.prisma.expense.aggregate({
        _sum: { amount: true },
        where: {
          userId: budget.userId,
          categoryId: budget.categoryId,
          timestamp: {
            gte: budget.startDate,
            lte: budget.endDate,
          },
        },
      });

      const alreadySpent = spent._sum.amount || 0;
      const budgetAmount = budget.amount * 100;
      const percentUsed = (alreadySpent / budgetAmount) * 100;

      const thresholds = [75, 90, 100];

      for (const threshold of thresholds) {
        if (percentUsed >= threshold && percentUsed < threshold + 5) {
          const today = new Date();
          today.setHours(0, 0, 0, 0);

          const alertExists = await this.prisma.budgetAlert.findFirst({
            where: {
              budgetId: budget.id,
              threshold,
              createdAt: { gte: today },
            },
          });

          if (!alertExists) {
            await this.notificationService.sendBudgetThresholdAlert(
              budget.user,
              budget,
              percentUsed,
            );

            await this.prisma.budgetAlert.create({
              data: {
                budgetId: budget.id,
                userId: budget.userId,
                threshold,
                percentUsed,
                message: `Budget ${threshold}% used for ${budget.category.name}`,
              },
            });

            this.logger.log(
              `Alert sent: ${budget.user.username} - ${budget.category.name} at ${percentUsed.toFixed(1)}%`,
            );
          }
        }
      }
    }
  }

  @Cron('0 20 * * *')
  async sendDailyExpenseSummary() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayExpenses = await this.prisma.expense.groupBy({
      by: ['userId'],
      where: {
        timestamp: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: { amount: true },
      _count: true,
    });

    for (const userExpense of todayExpenses) {
      const user = await this.prisma.user.findUnique({
        where: { id: userExpense.userId },
      });

      if (!user) continue;

      const totalSpent = (userExpense._sum.amount || 0) / 100;

      await this.notificationService.sendEmail(
        user.email,
        'Daily Expense Summary',
        `
          <h2>Your Daily Expense Summary</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <ul>
            <li><strong>Total Spent:</strong> ₦${totalSpent.toFixed(2)}</li>
            <li><strong>Transactions:</strong> ${userExpense._count}</li>
          </ul>
        `,
      );
    }
  }
}
