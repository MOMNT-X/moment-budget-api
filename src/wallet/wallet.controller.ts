// wallet.controller.ts
import {
  Controller,
  Post,
  Get,
  Body,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { PayDto } from './dto/pay.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('wallet')
@UseGuards(JwtGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  private getUserId(req: any): string {
    const userId = req.user?.userId || req.user?.sub; // support both id and sub
    if (!userId) throw new BadRequestException('Missing authenticated user ID');
    return userId;
  }

  @Post('deposit')
  deposit(@Req() req, @Body() dto: DepositDto) {
    const userId = this.getUserId(req);
    return this.walletService.deposit(userId, dto);
  }

  @Post('pay')
  pay(@Req() req, @Body() dto: PayDto) {
    const userId = this.getUserId(req);
    return this.walletService.pay(userId, dto);
  }

  @Get('balance')
  getBalance(@Req() req) {
    const userId = this.getUserId(req);
    return this.walletService.getWalletBalance(userId);
  }

  @Post('withdraw')
  withdraw(@Req() req, @Body('amount') amount: number) {
    const userId = this.getUserId(req);
    return this.walletService.withdraw(userId, amount);
  }

  @Post('confirm-deposit')
  confirmDeposit(@Req() req, @Body('reference') reference: string) {
    const userId = this.getUserId(req);
    return this.walletService.confirmDeposit(userId, reference);
  }

  @Post('create')
  create(@Req() req, @Body() body) {
    const userId = this.getUserId(req);
    return this.walletService.createWalletForUser(
      userId,
      body.email,
      body.businessName,
      body.bankCode,
      body.accountNumber,
    );
  }
}
