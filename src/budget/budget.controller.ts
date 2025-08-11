// budget.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { JwtGuard } from '../auth/jwt.guard';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';

@Controller('budgets')
@UseGuards(JwtGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  @Post()
  create(@Body() dto: CreateBudgetDto, @Req() req) {
    const userId = req.user.userId;
    return this.budgetService.createBudget(userId, dto);
  }

  @Get()
  findAll(@Req() req) {
    return this.budgetService.getUserBudgets(req.user.sub);
  }

  @Get('user/:userId')
  getBudgetsByUser(@Param('userId') userId: string, @Req() req) {
    if (req.user.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return this.budgetService.getUserBudgets(userId);
  }
}
