import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
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
    return this.transactionsService.create(req.user.sub, dto);
  }

  @Get()
  findAll(@Req() req, @Query() filters: FilterTransactionDto) {
  return this.transactionsService.findAll(req.user.sub, filters);
  }
}
