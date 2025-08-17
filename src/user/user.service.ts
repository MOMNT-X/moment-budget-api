import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { User as PrismaUser } from '@prisma/client';
import { Prisma } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async updateIncome(userId: string, income: number): Promise<PrismaUser> {
    return await this.prisma.user.update({
      where: { id: userId },
      data: { income },
    });
  }

  async create(dto: CreateUserDto): Promise<PrismaUser> {
    // Use a transaction so user + wallet are created atomically
    const [user] = await this.prisma.$transaction([
      this.prisma.user.create({ data: dto }),
      this.prisma.wallet.create({
        data: {
          balance: 0, // default balance
          currency: 'NGN', // adjust if you want multi-currency
          paystackRecipientCode: null,
          user: {
            connect: { email: dto.email }, // link wallet to user
          },
        },
      }),
    ]);

    return user;
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: string): Promise<PrismaUser> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }
}
