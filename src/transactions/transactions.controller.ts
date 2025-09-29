import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  Headers,
  RawBodyRequest,
  UseGuards,
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
    return this.transactionsService.create(req.user.userId, dto);
  }

  @Get()
  findAll(@Req() req, @Query() filters: FilterTransactionDto) {
  return this.transactionsService.findAll(req.user.userId, filters);
  }

  @Get("allUsers")
  findAllUsers(@Req() req) {
    return this.transactionsService.findAllUsers(req.user.sub);
  }

  /**
   * Webhook endpoint called by Paystack after transactions
   * NOTE: must be publicly accessible and registered in Paystack dashboard.
   */
  @Post('webhook')
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
  ) {
    // Verify signature
    const secret = process.env.PAYSTACK_SECRET_KEY!;
    const hash = crypto
      .createHmac('sha512', secret)
      .update((req as any).rawBody) // ensure raw body middleware is enabled
      .digest('hex');

    if (hash !== signature) {
      return { status: 'error', message: 'Invalid signature' };
    }

    const payload = req.body;
    return { status: 'ok' };
  }
}