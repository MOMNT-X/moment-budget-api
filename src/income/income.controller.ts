// src/income/income.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { IncomeService } from './income.service';
import { CreateIncomeDto } from './dto/create-income.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('income')
@UseGuards(JwtGuard)
export class IncomeController {
  constructor(private incomeService: IncomeService) {}

  @Post()
  addIncome(@Body() dto: CreateIncomeDto, @Req() req) {
    const userId = req.user.userId;
    return this.incomeService.addIncome(userId, dto);
  }
}
