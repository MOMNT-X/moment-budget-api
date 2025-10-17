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

  async findCategoriesWithBudgets(userId: string) {
  // Get all budgets for the user with their categories
  const budgets = await this.prisma.budget.findMany({
    where: { 
      userId,
      amount: { gt: 0 } // Only budgets with amount > 0
    },
    include: {
      category: true
    },
    orderBy: {
      category: {
        name: 'asc'
      }
    }
  });

  // Group by category and calculate total budget + spent
  const categoryMap = new Map();
  
  for (const budget of budgets) {
    const categoryId = budget.categoryId;
    
    if (!categoryMap.has(categoryId)) {
      // Get total spent for this category
      const transactions = await this.prisma.transaction.findMany({
        where: {
          userId,
          categoryId,
          type: 'EXPENSE'
        }
      });
      
      const totalSpent = transactions.reduce((sum, t) => sum + t.amount, 0);
      
      categoryMap.set(categoryId, {
        id: budget.category.id,
        name: budget.category.name,
        isDefault: budget.category.isDefault,
        budgetLimit: budget.amount, // This is in naira
        spent: totalSpent, // This is in kobo from transactions
        remaining: budget.amount - (totalSpent / 100) // Convert kobo to naira
      });
    } else {
      // Add to existing budget limit if multiple budgets exist
      const existing = categoryMap.get(categoryId);
      existing.budgetLimit += budget.amount;
      existing.remaining = existing.budgetLimit - (existing.spent / 100);
    }
  }

  return Array.from(categoryMap.values());
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
