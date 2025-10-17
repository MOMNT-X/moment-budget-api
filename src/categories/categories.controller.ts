// src/categories/categories.controller.ts
import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Req,
  Param,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('categories')
@UseGuards(JwtGuard)
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // POST /categories - Create custom category for authenticated user
  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.create(dto, userId);
  }

  // GET /categories/user - Get all categories for authenticated user (default + custom)
  @Get('user')
  findAllForUser(@Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findAllForUser(userId);
  }

  // GET /categories - Get all default categories (public endpoint)
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  @Get('with-budgets')
  findCategoriesWithBudgets(@Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findCategoriesWithBudgets(userId);
  }

  // DELETE /categories/:id - Delete custom category
  @Delete(':id')
  deleteCustomCategory(@Param('id') categoryId: string, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.deleteCustomCategory(categoryId, userId);
  }
}
