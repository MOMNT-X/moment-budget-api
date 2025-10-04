import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { RecurringExpensesService } from './recurring-expenses.service';
import { CreateRecurringExpenseDto } from './dto/create-recurring-expense.dto';
import { UpdateRecurringExpenseDto } from './dto/update-recurring-expense.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('recurring-expenses')
@UseGuards(JwtGuard)
export class RecurringExpensesController {
  constructor(private readonly recurringExpensesService: RecurringExpensesService) {}

  @Post()
  create(@Req() req, @Body() createRecurringExpenseDto: CreateRecurringExpenseDto) {
    return this.recurringExpensesService.create(req.user.userId, createRecurringExpenseDto);
  }

  @Get()
  findAll(@Req() req, @Query('activeOnly') activeOnly?: string) {
    const active = activeOnly !== 'false';
    return this.recurringExpensesService.findAll(req.user.userId, active);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.recurringExpensesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateRecurringExpenseDto: UpdateRecurringExpenseDto) {
    return this.recurringExpensesService.update(req.user.userId, id, updateRecurringExpenseDto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.recurringExpensesService.remove(req.user.userId, id);
  }
}
