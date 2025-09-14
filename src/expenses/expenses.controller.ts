import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Query,

} from '@nestjs/common';
import { ExpenseService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { FilterExpenseDto } from './dto/filter-expense.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { PaginateQuery } from 'nestjs-paginate';
@Controller('expenses')
@UseGuards(JwtGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @Req() req) {
    const userId = req.user.userId;
    return this.expenseService.createExpense(userId, dto);
  }

  @Get()
  findAll(@Query() dto: FilterExpenseDto, @Req() req) {
    const userId = req.user.userId;
    return this.expenseService.findUserExpenses(userId, dto);
  }

  @Get('all')
  getAllExpenses(@Query() query: PaginateQuery & FilterExpenseDto) {
    return this.expenseService.getExpenses(query, query);
  }
}