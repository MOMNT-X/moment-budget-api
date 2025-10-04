// src/categories/categories.service.ts
import {
  Injectable,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  // Seed default categories (run once during app initialization)
  async seedDefaultCategories() {
    const defaultCategories = [
      'Food',
      'Groceries',
      'Transportation',
      'Electricity Bills',
      'TV/Netflix',
      'Healthcare',
      'Entertainment',
      'Rent',
      'Shopping',
      'Education',
    ];

    for (const name of defaultCategories) {
      await this.prisma.budgetCategory.upsert({
        where: { name_userId: { name, userId: null as any } },
        update: {},
        create: { name, userId: null, isDefault: true },
      });
    }
  }

  // Create custom category for a specific user
  async create(dto: CreateCategoryDto, userId: string) {
    // Check if user already has a category with this name
    const existing = await this.prisma.budgetCategory.findFirst({
      where: {
        name: dto.name,
        userId,
      },
    });

    if (existing) {
      throw new ConflictException('You already have a category with this name');
    }

    return this.prisma.budgetCategory.create({
      data: {
        name: dto.name,
        userId,
        isDefault: false,
      },
    });
  }

  // Get all categories for a user (default + custom)
  async findAllForUser(userId: string) {
    return this.prisma.budgetCategory.findMany({
      where: {
        OR: [
          { userId: null, isDefault: true }, // Default categories
          { userId }, // User's custom categories
        ],
      },
      orderBy: [
        { isDefault: 'desc' }, // Default categories first
        { name: 'asc' },
      ],
    });
  }

  // Delete custom category (only if user owns it)
  async deleteCustomCategory(categoryId: string, userId: string) {
    const category = await this.prisma.budgetCategory.findUnique({
      where: { id: categoryId },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    if (category.isDefault) {
      throw new BadRequestException('Cannot delete default categories');
    }

    if (category.userId !== userId) {
      throw new BadRequestException('You can only delete your own categories');
    }

    // Check if category is in use
    const budgetsUsingCategory = await this.prisma.budget.count({
      where: { categoryId },
    });

    if (budgetsUsingCategory > 0) {
      throw new BadRequestException(
        'Cannot delete category that is being used in budgets',
      );
    }

    return this.prisma.budgetCategory.delete({
      where: { id: categoryId },
    });
  }

  async findAll() {
    return this.prisma.budgetCategory.findMany({
      where: { isDefault: true },
    });
  }
}
