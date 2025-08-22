import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletService } from '../wallet/wallet.service';
import { v4 as uuidv4 } from 'uuid';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { BillStatus } from '@prisma/client';

@Injectable()
export class BillService {
  constructor(
    private prisma: PrismaService,
    private walletService: WalletService,
  ) {}

  async createBill(userId: string, dto: any) {
    return this.prisma.bill.create({
      data: {
        userId,
        categoryId: dto.categoryId,
        amount: dto.amount * 100, // store in kobo
        description: dto.description,
        dueDate: new Date(dto.dueDate),
        autoPay: dto.autoPay || false,
        reference: uuidv4(), // generate unique reference
        paidAt: new Date(0), // placeholder for unpaid bill
        billStatus: BillStatus.PENDING, // default status
        currency: 'NGN', // default currency
      },
    });
  }

  async getBills(userId: string, status?: 'pending' | 'overdue' | 'paid') {
    const now = new Date();
    let where: any = { userId };

    if (status === 'pending') {
      where = {
        ...where,
        billStatus: BillStatus.PENDING,
        dueDate: { gte: now },
      };
    } else if (status === 'overdue') {
      where = {
        ...where,
        billStatus: BillStatus.PENDING,
        dueDate: { lt: now },
      };
    } else if (status === 'paid') {
      where = { ...where, billStatus: BillStatus.PAID };
    }

    return this.prisma.bill.findMany({
      where,
      include: { category: true },
      orderBy: { dueDate: 'asc' },
    });
  }

  async payBill(userId: string, billId: string) {
    const bill = await this.prisma.bill.findUnique({ where: { id: billId } });
    if (!bill || bill.userId !== userId) {
      throw new NotFoundException('Bill not found');
    }
    if (bill.billStatus === BillStatus.PAID)
      throw new BadRequestException('Bill already paid');

    // Use wallet.pay() logic under the hood
    await this.walletService.pay(userId, {
      amount: bill.amount / 100, // convert kobo to Naira
      categoryId: bill.categoryId,
      description: `Bill Payment: ${bill.description}`,
    });

    await this.prisma.bill.update({
      where: { id: billId },
      data: { billStatus: BillStatus.PAID, paidAt: new Date() },
    });

    return { message: 'Bill paid successfully' };
  }
}
