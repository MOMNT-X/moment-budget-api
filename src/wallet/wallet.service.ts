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
import { NotificationsService } from '../notifications/notifications.service';
import { generateReference } from '../utils/reference.util';

@Injectable()
export class WalletService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
    private readonly notificationService: NotificationsService,
  ) {}

  async createWalletForUser(
    userId: string,
    email: string,
    businessName: string,
    bankCode: string,
    accountNumber: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

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
        balance: 0,
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
      subaccountCode: wallet.paystackSubaccountCode || undefined,
      callback_url: process.env.FRONTEND_URL + '/paystack/callback',
    });

    return {
      authorizationUrl: paymentInit.data.authorization_url,
      reference: paymentInit.data.reference,
    };
  }

  async confirmDeposit(userId: string, reference: string) {
    const wallet = await this.prisma.wallet.findUnique({ where: { userId } });
    if (!wallet) throw new NotFoundException('Wallet not found');

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    const transactionData = await this.paystack.verifyPayment(reference);
    if (!transactionData.status || transactionData.status !== 'success') {
      throw new BadRequestException('Transaction verification failed');
    }

    const existingTx = await this.prisma.transaction.findFirst({
      where: { description: reference },
    });
    if (existingTx) {
      throw new BadRequestException('Transaction already processed');
    }

    const amountInKobo = transactionData.amount;
    const paidAt = transactionData.paidAt
      ? new Date(transactionData.paidAt)
      : new Date();

    await this.prisma.wallet.update({
      where: { userId },
      data: { balance: { increment: amountInKobo } },
    });

    const transaction = await this.prisma.transaction.create({
      data: {
        userId,
        amount: amountInKobo,
        type: TransactionType.DEPOSIT,
        description: reference,
        reference: generateReference(),
        status: 'success',
        timestamp: paidAt,
      },
    });

    await this.notificationService.sendTransactionNotification(
      user,
      transaction,
    );

    return transaction;
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

    if (amount < 100) {
      throw new BadRequestException('Minimum withdrawal amount is ₦100');
    }

    const wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { user: true },
    });

    if (!wallet) {
      throw new NotFoundException('Wallet not found');
    }

    const user = wallet.user;
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (wallet.balance < amountInKobo) {
      throw new BadRequestException(
        `Insufficient balance. Available: ₦${(wallet.balance / 100).toFixed(2)}, Requested: ₦${amount.toFixed(2)}`,
      );
    }

    if (!wallet.paystackAccountNumber || !wallet.paystackBankName) {
      throw new BadRequestException(
        'Bank details not found. Please update your bank information.',
      );
    }

    let recipientCode = wallet.paystackRecipientCode;

    if (!recipientCode) {
      const recipientName =
        user.firstName && user.lastName
          ? `${user.firstName} ${user.lastName}`
          : user.username;

      try {
        const recipient = await this.paystack.createTransferRecipient({
          type: 'nuban',
          name: recipientName,
          bank_code: wallet.paystackBankName,
          account_number: wallet.paystackAccountNumber,
        });

        recipientCode = recipient.recipient_code;

        await this.prisma.wallet.update({
          where: { userId },
          data: { paystackRecipientCode: recipientCode },
        });
      } catch (error) {
        throw new BadRequestException(
          `Failed to create transfer recipient: ${error.message}`,
        );
      }
    }

    const reference = generateReference();
    const withdrawal = await this.prisma.transaction.create({
      data: {
        userId,
        amount: amountInKobo,
        description: 'Withdrawal to bank account',
        type: 'WITHDRAWAL',
        reference,
        status: 'pending',
      },
    });

    try {
      if (!recipientCode) {
        throw new Error('Recipient code is required');
      }

      const transfer = await this.paystack.initiateTransfer({
        amountKobo: amountInKobo,
        recipientCode,
        reason: 'Wallet withdrawal',
        reference,
      });

      await this.prisma.wallet.update({
        where: { userId },
        data: { balance: { decrement: amountInKobo } },
      });

      await this.prisma.transaction.update({
        where: { id: withdrawal.id },
        data: {
          status: 'processing',
          metadata: {
            transferCode: transfer.transfer_code,
            transferId: transfer.id,
          },
        },
      });

      await this.notificationService.sendEmail(
        user.email,
        'Withdrawal Request Received',
        `
          <h2>Withdrawal Request</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Your withdrawal request has been received and is being processed.</p>
          <ul>
            <li><strong>Amount:</strong> ₦${amount.toFixed(2)}</li>
            <li><strong>Account:</strong> ${wallet.paystackAccountNumber}</li>
            <li><strong>Bank:</strong> ${wallet.paystackBankName}</li>
            <li><strong>Reference:</strong> ${reference}</li>
          </ul>
          <p>Funds will be credited to your account within 24 hours.</p>
        `,
      );

      return {
        message: 'Withdrawal initiated successfully',
        reference,
        amount: amount,
        status: 'processing',
        estimatedArrival: '24 hours',
      };
    } catch (error) {
      await this.prisma.transaction.delete({ where: { id: withdrawal.id } });

      throw new BadRequestException(
        `Withdrawal failed: ${error.message || 'Please try again later'}`,
      );
    }
  }

  async handleTransferWebhook(data: any) {
    const { reference, status } = data;

    const transaction = await this.prisma.transaction.findFirst({
      where: { reference },
    });

    if (!transaction) {
      console.error(`Transaction not found for reference: ${reference}`);
      return;
    }

    const user = await this.prisma.user.findUnique({
      where: { id: transaction.userId },
    });

    if (!user) {
      console.error(`User not found for transaction reference: ${reference}`);
      return;
    }

    if (status === 'success') {
      await this.prisma.transaction.update({
        where: { id: transaction.id },
        data: { status: 'success' },
      });

      await this.notificationService.sendEmail(
        user.email,
        'Withdrawal Successful',
        `
          <h2>Withdrawal Completed</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Your withdrawal has been completed successfully.</p>
          <ul>
            <li><strong>Amount:</strong> ₦${(transaction.amount / 100).toFixed(2)}</li>
            <li><strong>Reference:</strong> ${reference}</li>
          </ul>
        `,
      );
    } else if (status === 'failed' || status === 'reversed') {
      await this.prisma.$transaction([
        this.prisma.wallet.update({
          where: { userId: transaction.userId },
          data: { balance: { increment: transaction.amount } },
        }),
        this.prisma.transaction.update({
          where: { id: transaction.id },
          data: { status: 'failed' },
        }),
      ]);

      await this.notificationService.sendEmail(
        user.email,
        'Withdrawal Failed - Refunded',
        `
          <h2>Withdrawal Failed</h2>
          <p>Hello ${user.firstName || user.username},</p>
          <p>Your withdrawal could not be completed and has been refunded to your wallet.</p>
          <ul>
            <li><strong>Amount:</strong> ₦${(transaction.amount / 100).toFixed(2)}</li>
            <li><strong>Reference:</strong> ${reference}</li>
          </ul>
        `,
      );
    }
  }
}
