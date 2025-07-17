// budget.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtGuard } from '../auth/jwt.guard';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(JwtGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Body() dto: CreateBudgetDto, @Req() req) {
    const userId = req.user.sub;
    return this.budgetService.createBudget(userId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.budgetService.getUserBudgets(req.user.sub);
  }
}
