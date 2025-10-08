import { Controller, Get, Post, Query, Body, Param } from '@nestjs/common';
import { PaystackService } from './pay-stack.service';

@Controller('paystack')
export class PaystackController {
  constructor(private readonly paystackService: PaystackService) {}

  @Get('banks')
  async getBanks(@Query('country') country?: string) {
    return this.paystackService.getBanks(country || 'NG');
  }

  @Post('subaccount')
  async createSubaccount(
    @Body('businessName') businessName: string,
    @Body('bankCode') bankCode: string,
    @Body('accountNumber') accountNumber: string,
  ) {
    return this.paystackService.createSubaccount({
      bank_code: bankCode,
      account_number: accountNumber,
      business_name: businessName,
    });
  }

  @Post('initialize')
  async initializePayment(
    @Body('amount') amountKobo: number,
    @Body('email') email: string,
    @Body('subaccountCode') subaccountCode?: string,
  ) {
    return this.paystackService.initializePayment({
      amountKobo: amountKobo * 100, // convert to kobo
      email,
      subaccountCode,
    });
  }

  @Get('verify/:reference')
  async verifyPayment(@Param('reference') reference: string) {
    return this.paystackService.verifyPayment(reference);
  }

  @Post('verify-account')
  async resolveAccountNumber(
    @Body('accountNumber') accountNumber: string,
    @Body('bankCode') bankCode: string,
  ) {
    return this.paystackService.resolveAccountNumber(accountNumber, bankCode);
  }
}
