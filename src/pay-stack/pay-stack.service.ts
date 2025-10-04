import { Injectable, BadRequestException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class PaystackService {
  private readonly baseUrl =
    process.env.PAYSTACK_BASE_URL || 'https://api.paystack.co';
  private readonly secretKey = process.env.PAYSTACK_SECRET_KEY!;

  constructor(private readonly http: HttpService) {}

  private get headers() {
    return { Authorization: `Bearer ${this.secretKey}` };
  }

  async getBanks(countryCode = 'NG') {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/bank?country=${countryCode}`, {
          headers: this.headers,
        }),
      );
      return data.data;
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error fetching banks from Paystack',
      );
    }
  }

  // Accepts an object (matches how you'll call it)
  async createSubaccount(payload: {
    business_name: string;
    bank_code: string;
    account_number: string;
    percentage_charge?: number; // default 0
  }) {
    try {
      const body = { percentage_charge: 0, ...payload };
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/subaccount`, body, {
          headers: this.headers,
        }),
      );
      return data.data; // contains subaccount_code, settlement_bank, account_number, etc.
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error creating Paystack subaccount',
      );
    }
  }

  async createTransferRecipient(payload: {
    type: 'nuban';
    name: string;
    bank_code: string;
    account_number: string;
    currency?: 'NGN';
  }) {
    try {
      const body = { currency: 'NGN', ...payload };
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transferrecipient`, body, {
          headers: this.headers,
        }),
      );
      return data.data; // contains recipient_code
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error creating Paystack recipient',
      );
    }
  }

  /**
   * amount is expected in KOBO already (no extra *100).
   */
  async initializePayment(dto: {
    amountKobo: number;
    email: string;
    subaccountCode?: string;
    metadata?: Record<string, any>;
    callback_url?: string;
  }) {
    try {
      const payload: any = {
        amount: dto.amountKobo,
        email: dto.email,
        bearer: dto.subaccountCode ? 'subaccount' : undefined,
        subaccount: dto.subaccountCode,
        metadata: dto.metadata,
        callback_url: dto.callback_url,
      };
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transaction/initialize`, payload, {
          headers: this.headers,
        }),
      );
      return data; // { status, message, data: { authorization_url, access_code, reference } }
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error initializing payment',
      );
    }
  }

  async verifyPayment(reference: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(`${this.baseUrl}/transaction/verify/${reference}`, {
          headers: this.headers,
        }),
      );
      return data.data; // contains status, amount (kobo), reference, metadata, etc.
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error verifying payment',
      );
    }
  }

  /**
   * Initiate payout to a recipient (amount in KOBO).
   */
  async initiateTransfer(dto: {
    amountKobo: number;
    recipientCode: string;
    reason?: string;
    reference?: string;
  }) {
    try {
      const body = {
        amount: dto.amountKobo,
        recipient: dto.recipientCode,
        reason: dto.reason,
        reference: dto.reference,
      };
      const { data } = await firstValueFrom(
        this.http.post(`${this.baseUrl}/transfer`, body, {
          headers: this.headers,
        }),
      );
      return data.data;
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error initiating transfer',
      );
    }
  }

  async resolveAccountNumber(accountNumber: string, bankCode: string) {
    try {
      const { data } = await firstValueFrom(
        this.http.get(
          `${this.baseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
          { headers: this.headers },
        ),
      );
      return data.data;
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data?.message ||
          'Error verifying account details. Please check the account number and bank.',
      );
    }
  }

  async finalizeTransfer() {
    try {
      const { data } = await firstValueFrom(
        this.http.post(
          `${this.baseUrl}/transfer/finalize_transfer`,
          {},
          { headers: this.headers },
        ),
      );
      return data.data;
    } catch (err: any) {
      throw new BadRequestException(
        err.response?.data || 'Error finalizing transfer',
      );
    }
  }
}
