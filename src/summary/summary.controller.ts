import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SummaryService } from './summary.service';
import { JwtGuard } from '../auth/jwt.guard';
import { Request } from 'express';

@Controller('summary')
@UseGuards(JwtGuard)
export class SummaryController {
  constructor(private readonly summaryService: SummaryService) {}

  @Get()
  getSummary(@Req() req: Request) {
    const userId = req.user['sub']; // from JWT
    return this.summaryService.getUserSummary(userId);
  }
}
