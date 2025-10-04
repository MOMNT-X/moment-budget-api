import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

@Injectable()
export class FinancialGoalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateGoalDto) {
    return this.prisma.financialGoal.create({
      data: {
        userId,
        name: dto.name,
        targetAmount: dto.targetAmount,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
        categoryId: dto.categoryId,
      },
      include: { category: true },
    });
  }

  async findAll(userId: string, status?: string) {
    const where: any = { userId };

    if (status) {
      where.status = status;
    }

    return this.prisma.financialGoal.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const goal = await this.prisma.financialGoal.findFirst({
      where: { id, userId },
      include: { category: true },
    });

    if (!goal) {
      throw new NotFoundException('Financial goal not found');
    }

    const progress = goal.targetAmount > 0
      ? Math.min((goal.currentAmount / goal.targetAmount) * 100, 100)
      : 0;

    return {
      ...goal,
      progress: Math.round(progress * 100) / 100,
      remaining: Math.max(goal.targetAmount - goal.currentAmount, 0),
    };
  }

  async update(userId: string, id: string, dto: UpdateGoalDto) {
    const goal = await this.findOne(userId, id);

    const updatedGoal = await this.prisma.financialGoal.update({
      where: { id },
      data: {
        ...dto,
        deadline: dto.deadline ? new Date(dto.deadline) : undefined,
      },
      include: { category: true },
    });

    if (updatedGoal.currentAmount >= updatedGoal.targetAmount && updatedGoal.status === 'ACTIVE') {
      await this.prisma.financialGoal.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    }

    return this.findOne(userId, id);
  }

  async contribute(userId: string, id: string, amount: number) {
    if (amount <= 0) {
      throw new BadRequestException('Contribution amount must be greater than 0');
    }

    const goal = await this.findOne(userId, id);

    if (goal.status !== 'ACTIVE') {
      throw new BadRequestException('Can only contribute to active goals');
    }

    const updatedGoal = await this.prisma.financialGoal.update({
      where: { id },
      data: {
        currentAmount: { increment: amount },
      },
    });

    if (updatedGoal.currentAmount >= updatedGoal.targetAmount) {
      await this.prisma.financialGoal.update({
        where: { id },
        data: { status: 'COMPLETED' },
      });
    }

    return this.findOne(userId, id);
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.financialGoal.delete({
      where: { id },
    });
  }
}
