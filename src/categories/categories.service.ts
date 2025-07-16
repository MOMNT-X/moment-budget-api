// src/budget-category/budget-category.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Injectable()
export class CategoryService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateCategoryDto) {
    return this.prisma.budgetCategory.create({ data: dto });
  }

  async findAll() {
    return this.prisma.budgetCategory.findMany();
  }
}
