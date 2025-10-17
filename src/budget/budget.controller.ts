// budget.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  UseGuards,
  Req,
  Param,
  Query,
  Put,
  Delete,
} from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import { JwtGuard } from '../auth/jwt.guard';
import { BudgetService } from './budget.service';
import { CreateBudgetDto } from './dto/create-budget.dto';
import { UpdateBudgetDto } from './dto/update-budget.dto';

@Controller('budgets')
@UseGuards(JwtGuard)
export class BudgetController {
  constructor(private readonly budgetService: BudgetService) {}

  private getUserId(req: any): string {
    const userId = req.user?.userId || req.user?.sub; // support both id and sub
    if (!userId) throw new BadRequestException('Missing authenticated user ID');
    return userId;
  }

  @Post()
  create(@Body() dto: CreateBudgetDto, @Req() req, ) {
    const userId = this.getUserId(req);
    return this.budgetService.create(userId, dto);
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
  @Get('summary')
  async getSummary(
    @Req() req,
    @Query('month') month?: string,
    @Query('week') week?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const userId = this.getUserId(req);
    const summary = await this.budgetService.getBudgetSummary(userId, {
      month: month ? parseInt(month, 10) : undefined,
      week: week ? parseInt(week, 10) : undefined,
      categoryId,
    });

    return {
      status: true,
      message: `Budget summary fetched successfully (${summary.status})`,
      data: summary,
    };
  }

  @Put(':id')
  update(
    @Param('id') budgetId: string,
    @Body() dto: UpdateBudgetDto,
    @Req() req,
  ) {
    const userId = req.user.userId;
    return this.budgetService.update(budgetId, userId, dto);
  }

  // DELETE /budgets/:id - Delete budget
  @Delete(':id')
  delete(@Param('id') budgetId: string, @Req() req) {
    const userId = req.user.userId;
    return this.budgetService.delete(budgetId, userId);
  }
}
