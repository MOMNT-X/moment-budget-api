import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('dashboard')
@UseGuards(JwtGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('summary')
  async getSummary(@Req() req) {
    const userId = req.user.id;
    return this.dashboardService.getSummary(userId);
  }

  @Get('transactions')
  async getTransactions(@Req() req, @Query('limit') limit: number = 10) {
    const userId = req.user.id;
    return this.dashboardService.getTransactions(userId, limit);
  }

  @Get('categories')
  async getCategories(@Req() req) {
    const userId = req.user.id;
    return this.dashboardService.getCategoryBreakdown(userId);
  }
}
