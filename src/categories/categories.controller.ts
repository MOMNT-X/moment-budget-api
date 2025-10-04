// src/budget-category/budget-category.controller.ts
import { Controller, Post, Get, Body, Req } from '@nestjs/common';
import { CategoryService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';

@Controller('categories')
export class CategoryController {
  constructor(
    private readonly categoryService: CategoryService,
  ) {}

  @Post()
  create(@Body() dto: CreateCategoryDto, @Req() req) {
    const userId = req.user.userId;
    return this.categoryService.create(dto, userId);
  }

  @Get()
  findAll() {
    return this.categoryService.findAll();
  }
  @Get()
  findAllForUser(@Req() req) {
    const userId = req.user.userId;
    return this.categoryService.findAllForUser(userId);
  }
}
