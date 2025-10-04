import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req, Query } from '@nestjs/common';
import { FinancialGoalsService } from './financial-goals.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('financial-goals')
@UseGuards(JwtGuard)
export class FinancialGoalsController {
  constructor(private readonly financialGoalsService: FinancialGoalsService) {}

  @Post()
  create(@Req() req, @Body() createGoalDto: CreateGoalDto) {
    return this.financialGoalsService.create(req.user.userId, createGoalDto);
  }

  @Get()
  findAll(@Req() req, @Query('status') status?: string) {
    return this.financialGoalsService.findAll(req.user.userId, status);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.financialGoalsService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateGoalDto: UpdateGoalDto) {
    return this.financialGoalsService.update(req.user.userId, id, updateGoalDto);
  }

  @Post(':id/contribute')
  contribute(@Req() req, @Param('id') id: string, @Body('amount') amount: number) {
    return this.financialGoalsService.contribute(req.user.userId, id, amount);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.financialGoalsService.remove(req.user.userId, id);
  }
}
