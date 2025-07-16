import {
  Controller,
  Post,
  Body,
  Get,
  Req,
} from '@nestjs/common';
import { ExpenseService } from './expenses.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { JwtGuard } from '../auth/jwt.guard';


@Controller('expenses')
@UseGuards(JwtAuthGuard)
export class ExpenseController {
  constructor(private readonly expenseService: ExpenseService) {}

  @Post()
  create(@Body() dto: CreateExpenseDto, @Req() req) {
    const userId = req.user.sub;
    return this.expenseService.create(userId, dto);
  }

  @Get()
  findAll(@Body() dto: CreateExpenseDto, @Req() req) {
    const userId = req.user.sub;
    return this.expenseService.findUserExpenses(userId, dto);
  }
}
