// wallet.controller.ts
import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { WalletService } from './wallet.service';
import { DepositDto } from './dto/deposit.dto';
import { PayDto } from './dto/pay.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('wallet')
@UseGuards(JwtGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Post('deposit')
  deposit(@Req() req, @Body() dto: DepositDto) {
    return this.walletService.deposit(req.user.sub, dto);
  }

  @Post('pay')
  pay(@Req() req, @Body() dto: PayDto) {
    return this.walletService.pay(req.user.sub, dto);
  }
}
