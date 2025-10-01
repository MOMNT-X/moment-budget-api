import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { BillService } from './bills.service';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('bills')
@UseGuards(JwtGuard) // protect all bill routes
export class BillsController {
  constructor(private readonly billService: BillService) {}

  // Create a new bill
  @Post()
  async createBill(@Req() req, @Body() dto: any) {
    return this.billService.createBill(req.user.userId, dto);
  }

  // Get bills with optional status filter
  @Get()
  async getBills(
    @Req() req,
    @Query('status') billStatus?: 'PENDING' | 'OVERDUE' | 'PAID',
  ) {
    return this.billService.getBills(req.user.userId, billStatus);
  }

  // Pay a specific bill
  @Post(':id/pay')
  async payBill(@Req() req, @Param('id') billId: string) {
    return this.billService.payBill(req.user.userId, billId);
  }
}
