import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { addDays, addWeeks, addMonths, addYears } from 'date-fns';

@Injectable()
export class RecurringExpensesService {
  private readonly logger = new Logger(RecurringExpensesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateRecurringExpenseDto) {
    const amountKobo = dto.amount * 100;

    return this.prisma.recurringExpense.create({
      data: {
        userId,
        amount: amountKobo,
        description: dto.description,
        categoryId: dto.categoryId,
        frequency: dto.frequency,
        nextDueDate: new Date(dto.nextDueDate),
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
      include: { category: true },
    });
  }

  async findAll(userId: string, activeOnly = true) {
    const where: any = { userId };

    if (activeOnly) {
      where.isActive = true;
    }

    return this.prisma.recurringExpense.findMany({
      where,
      include: { category: true },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async findOne(userId: string, id: string) {
    const recurringExpense = await this.prisma.recurringExpense.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!recurringExpense) {
      throw new NotFoundException('Recurring expense not found');
    }

    return recurringExpense;
  }

  async update(userId: string, id: string, dto: UpdateRecurringExpenseDto) {
    await this.findOne(userId, id);

    const updateData: any = {};

    if (dto.amount !== undefined) {
      updateData.amount = dto.amount * 100;
    }

    if (dto.description !== undefined) {
      updateData.description = dto.description;
    }

    if (dto.categoryId !== undefined) {
      updateData.categoryId = dto.categoryId;
    }

    if (dto.frequency !== undefined) {
      updateData.frequency = dto.frequency;
    }

    if (dto.nextDueDate !== undefined) {
      updateData.nextDueDate = new Date(dto.nextDueDate);
    }

    if (dto.endDate !== undefined) {
      updateData.endDate = new Date(dto.endDate);
    }

    if (dto.isActive !== undefined) {
      updateData.isActive = dto.isActive;
    }

    return this.prisma.recurringExpense.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.recurringExpense.delete({
      where: { id },
    });
  }

  @Cron('0 0 * * *')
  async processRecurringExpenses() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueExpenses = await this.prisma.recurringExpense.findMany({
      where: {
        isActive: true,
        nextDueDate: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: { category: true, user: true },
    });

    for (const expense of dueExpenses) {
      try {
        await this.prisma.expense.create({
          data: {
            userId: expense.userId,
            amount: expense.amount,
            description: `[Recurring] ${expense.description}`,
            categoryId: expense.categoryId,
          },
        });

        const nextDueDate = this.calculateNextDueDate(expense.nextDueDate, expense.frequency);

        if (expense.endDate && nextDueDate > expense.endDate) {
          await this.prisma.recurringExpense.update({
            where: { id: expense.id },
            data: { isActive: false },
          });

          this.logger.log(`Deactivated recurring expense ${expense.id} - reached end date`);
        } else {
          await this.prisma.recurringExpense.update({
            where: { id: expense.id },
            data: { nextDueDate },
          });

          this.logger.log(`Processed recurring expense ${expense.id} for user ${expense.userId}`);
        }
      } catch (error) {
        this.logger.error(
          `Failed to process recurring expense ${expense.id}:`,
          error.message,
        );
      }
    }

    this.logger.log(`Processed ${dueExpenses.length} recurring expenses`);
  }

  private calculateNextDueDate(currentDate: Date, frequency: string): Date {
    switch (frequency) {
      case 'DAILY':
        return addDays(currentDate, 1);
      case 'WEEKLY':
        return addWeeks(currentDate, 1);
      case 'MONTHLY':
        return addMonths(currentDate, 1);
      case 'YEARLY':
        return addYears(currentDate, 1);
      default:
        return addMonths(currentDate, 1);
    }
  }
}
