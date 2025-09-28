import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  Param,
  Headers,
  HttpCode,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { FilterTransactionDto } from './dto/filter-transaction.dto';
import * as crypto from 'crypto';

@Controller('transactions')
@UseGuards(JwtGuard)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  create(@Body() dto: CreateTransactionDto, @Req() req) {
    const userId = req.user.userId;
    const email = req.user.email;
    return this.transactionsService.create(userId, email, dto);
  }

  @Get()
  findAll(@Req() req, @Query() filters: FilterTransactionDto) {
    return this.transactionsService.findAll(req.user.userId, filters);
  }

  @Get('allUsers')
  findAllUsers(@Req() req) {
    return this.transactionsService.findAllUsers(req.user.sub);
  }

  @Post('confirm/:reference')
  async confirmTPayment(@Param('reference') reference: string) {
    return this.transactionsService.confirmPayment(reference);
  }

  /**
   * Paystack webhook endpoint
   */
  @Post('webhook')
  @HttpCode(200)
  async handleWebhook(
    @Body() body: any,
    @Headers('x-paystack-signature') signature: string,
  ) {
    const secret = process.env.PAYSTACK_SECRET_KEY!;

    // Verify Paystack signature
    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(body))
      .digest('hex');

    if (hash !== signature) {
      return { status: false, message: 'Invalid signature' };
    }

    // Handle successful charge
    if (body.event === 'charge.success') {
      await this.transactionsService.autoConfirm(body.data.reference);
    }

    return { status: true };
  }
}
