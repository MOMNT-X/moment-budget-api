import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DepositDto } from './dto/deposit.dto';
import { PayDto } from './dto/pay.dto';
import { TransactionType } from '../transactions/entities/transaction.entity';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { generateReference } from '../utils/reference.util';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  // Called during signup
  async createWalletForUser(
    userId: string,
    email: string,
    businessName: string,
    bankCode: string,
    accountNumber: string,
  ) {
    const subaccount = await this.paystack.createSubaccount({
      business_name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
      percentage_charge: 0.0,
    });

    const recipient = await this.paystack.createTransferRecipient({
      type: 'nuban',
      name: businessName,
      bank_code: bankCode,
      account_number: accountNumber,
    });

    return this.prisma.wallet.create({
      data: {
        userId,
        balance: 0, // kobo
        paystackSubaccountCode: subaccount.subaccount_code,
        paystackBankName: subaccount.settlement_bank,
        paystackAccountNumber: subaccount.account_number,
        paystackRecipientCode: recipient.recipient_code,
      },
    });
  }

  async deposit(userId: string, dto: DepositDto) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const amountInKobo = dto.amount * 100;

    const paymentInit = await this.paystack.initializePayment({
      email: dto.email,
      amountKobo: amountInKobo,
      subaccountCode: wallet.paystackSubaccountCode,
      callback_url: 'https://yourdomain.com/paystack/callback', // update to your real callback
    });

    console.log('url:', paymentInit.data.authorization_url);
    
    return {
      authorizationUrl: paymentInit.data.authorization_url,
      reference: paymentInit.data.reference, // <-- include this      
    };
  }

  async confirmDeposit(userId: string, reference: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const transactionData = await this.paystack.verifyPayment(reference);
    if (!transactionData.status || transactionData.status !== 'success') {
      throw new BadRequestException('Transaction verification failed');
    }

    // Prevent double processing
    const existingTx = await this.prisma.transaction.findFirst({
      where: { description: reference },
    });
    if (existingTx) {
      throw new BadRequestException('Transaction already processed');
    }

    const amountInKobo = transactionData.amount; // kobo
    const paidAt = transactionData.paidAt
      ? new Date(transactionData.paidAt)
      : new Date();

    // Update wallet balance
    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amountInKobo } },
    });

    // Create transaction with status 'success' and store paid_at
    return this.prisma.transaction.create({
      data: {
        userId,
        amount: amountInKobo,
        type: TransactionType.DEPOSIT,
        description: reference,
        reference: generateReference(),
        status: 'success', // mark transaction successful
        timestamp: paidAt, // store exact paid_at from Paystack
      },
    });
  }

  async pay(userId: string, dto: PayDto) {
    const amountInKobo = dto.amount * 100;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amountInKobo) {
      throw new BadRequestException('Insufficient balance');
    }

    const now = new Date();
    const budget = await this.prisma.budget.findFirst({
      where: {
        userId,
        categoryId: dto.categoryId,
        startDate: { lte: now },
        endDate: { gte: now },
      },
    });

    if (!budget) {
      throw new BadRequestException('No active budget for this category');
    }

    const spent = await this.prisma.expense.aggregate({
      _sum: { amount: true },
      where: {
        userId,
        categoryId: dto.categoryId,
        timestamp: {
          gte: budget.startDate,
          lte: budget.endDate,
        },
      },
    });

    const alreadySpentKobo = spent._sum.amount || 0;
    const budgetAmountKobo = budget.amount * 100;

    if (alreadySpentKobo + amountInKobo > budgetAmountKobo) {
      throw new BadRequestException('Budget exceeded for this category');
    }

    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: amountInKobo } },
      }),
      this.prisma.expense.create({
        data: {
          userId,
          amount: amountInKobo,
          description: dto.description,
          categoryId: dto.categoryId,
        },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          amount: amountInKobo,
          description: dto.description,
          type: TransactionType.EXPENSE,
          categoryId: dto.categoryId,
          reference: generateReference(),
        },
      }),
    ]);

    return { message: 'Payment successful' };
  }

  async getWalletBalance(userId: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });

    if (!wallet) throw new NotFoundException('Wallet not found');

    return {
      balance: wallet.balance,
      subaccountCode: wallet.paystackSubaccountCode,
      bankName: wallet.paystackBankName,
      accountNumber: wallet.paystackAccountNumber,
    };
  }

  async withdraw(userId: string, amount: number) {
    const amountInKobo = amount * 100;

    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet || wallet.balance < amountInKobo) {
      throw new BadRequestException('Insufficient balance');
    }

    // If no recipient code, create one
    let recipientCode = wallet.paystackRecipientCode;

    if (!recipientCode) {
      // Fetch user details (adjust if your user table has different fields)
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { firstName: true, lastName: true },
      });

      if (!wallet.paystackAccountNumber || !wallet.paystackBankName) {
        throw new BadRequestException('Bank details missing in wallet');
      }

      const recipient = await this.paystack.createTransferRecipient({
        type: 'nuban',
        name: user
          ? `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim()
          : 'Wallet User',
        bank_code: wallet.paystackBankName,
        account_number: wallet.paystackAccountNumber,
      });

      recipientCode = recipient.recipient_code;

      await this.prisma.wallet.update({
        where: { userId },
        data: { paystackRecipientCode: recipientCode },
      });
    }

    // Send transfer
    await this.paystack.initiateTransfer({
      amountKobo: amountInKobo,
      recipientCode: wallet.paystackRecipientCode!,
      reason: 'User withdrawal',
    });

    // Deduct balance + record transaction
    await this.prisma.$transaction([
      this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: amountInKobo } },
      }),
      this.prisma.transaction.create({
        data: {
          userId,
          amount: amountInKobo,
          description: 'Withdrawal to bank',
          type: TransactionType.WITHDRAWAL,
          reference: generateReference(),
        },
      }),
    ]);

    return { message: 'Withdrawal successful' };
  }
}
