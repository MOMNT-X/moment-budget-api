import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaystackService {
  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY;

  constructor(private readonly http: HttpService) {}

  async getBanks(countryCode = 'NG') {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/bank?country=${countryCode}`, {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        }),
      );
      return data.data; // list of banks
    } catch (err) {
      throw new BadRequestException(
        err.response?.data || 'Error fetching banks from Paystack',
      );
    }
  }

  async createSubaccount(
    businessName: string,
    bankCode: string,
    accountNumber: string,
  ) {
    try {
      const payload = {
        business_name: businessName,
        bank_code: bankCode,
        account_number: accountNumber,
        percentage_charge: 0, // no split unless you want
      };

      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/subaccount`, payload, {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        }),
      );

      return data.data.subaccount_code;
    } catch (err) {
      throw new BadRequestException(
        err.response?.data || 'Error creating Paystack subaccount',
      );
    }
  }

  async initializePayment(
    amount: number,
    email: string,
    subaccountCode?: string,
  ) {
    try {
      const payload: any = {
        amount: amount * 100, // convert to kobo
        email,
      };
      if (subaccountCode) payload.subaccount = subaccountCode;

      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        }),
      );

      return data.data; // contains authorization_url, access_code, reference
    } catch (err) {
      throw new BadRequestException(
        err.response?.data || 'Error initializing payment',
      );
    }
  }

  async verifyPayment(reference: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: { Authorization: `Bearer ${this.secretKey}` },
        }),
      );

      return data.data;
    } catch (err) {
      throw new BadRequestException(
        err.response?.data || 'Error verifying payment',
      );
    }
  }
}
