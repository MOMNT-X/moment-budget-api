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
    // Create only the user, wallet creation will be handled in AuthService
    const user = await this.prisma.user.create({ 
      data: dto 
    });

    return user;
  }

  async update(id: string, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async findByEmail(email: string): Promise<PrismaUser | null> {
    return await this.prisma.user.findUnique({ where: { email } });
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        username: true,
        firstName: true,
        lastName: true,
        bankName: true,
        accountNumber: true,
        bankCode: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}