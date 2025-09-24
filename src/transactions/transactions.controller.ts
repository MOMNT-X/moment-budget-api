import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  Param,
} from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { FilterTransactionDto } from './dto/filter-transaction.dto';

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
}
