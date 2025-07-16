// src/income/income.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateIncomeDto } from './dto/create-income.dto';

@Injectable()
export class IncomeService {
  constructor(private prisma: PrismaService) {}

  async addIncome(userId: string, dto: CreateIncomeDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) {
      // Create wallet if it doesn't exist
      await this.prisma.wallet.create({
        data: {
          userId,
          balance: dto.amount,
        },
      });
    } else {
      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: wallet.balance + dto.amount },
      });
    }

    return this.prisma.transaction.create({
      data: {
        userId,
        amount: dto.amount,
        description: dto.description,
        type: 'INCOME',
      },
    });
  }
}
