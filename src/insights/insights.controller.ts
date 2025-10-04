import { Controller, Get, UseGuards, Req, Query } from '@nestjs/common';
import { InsightsService } from './insights.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('insights')
@UseGuards(JwtGuard)
export class InsightsController {
  constructor(private readonly insightsService: InsightsService) {}

  @Get('spending')
  getSpendingInsights(
    @Req() req,
    @Query('period') period?: 'week' | 'month' | 'year',
  ) {
    return this.insightsService.getSpendingInsights(req.user.userId, period);
  }

  @Get('trends')
  getSpendingTrends(
    @Req() req,
    @Query('months') months?: string,
  ) {
    const monthsNum = months ? parseInt(months, 10) : 6;
    return this.insightsService.getSpendingTrends(req.user.userId, monthsNum);
  }

  @Get('budget-performance')
  getBudgetPerformance(@Req() req) {
    return this.insightsService.getBudgetPerformance(req.user.userId);
  }

  @Get('recommendations')
  getSavingsRecommendations(@Req() req) {
    return this.insightsService.getSavingsRecommendations(req.user.userId);
  }
}
