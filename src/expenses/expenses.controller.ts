import {
  Controller,
  Post,
  Body,
  Get,
  Req,
  UseGuards,
  Query,
  Param
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
    return this.expenseService.createExpense(req.user.userId, dto);
  }

  // Get current user's expenses (filterable)
  @Get()
  findAll(@Query() dto: FilterExpenseDto, @Req() req) {
    return this.expenseService.findUserExpenses(req.user.userId, dto);
  }

  // Get all users' expenses (paginated, filterable)
  @Get('all')
  getAllExpenses(@Query() query: PaginateQuery & FilterExpenseDto) {
    return this.expenseService.getExpenses(query, query);
  }

  // Get single expense (by id, scoped to user)
  @Get(':id')
  findOne(@Param('id') id: string, @Req() req) {
    return this.expenseService.findOneExpense(req.user.userId, id);
  }

 @Get('summary')
  async getExpensesSummary(
    @Req() req: any, // you can replace `any` with your custom request user type
    @Query('month') month?: string,
    @Query('week') week?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    return this.expenseService.getExpensesSummary(req.user.userId, {
      month: month ? parseInt(month, 10) : undefined,
      week: week ? parseInt(week, 10) : undefined,
      categoryId,
    });
  }
}
