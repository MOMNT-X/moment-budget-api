import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly paystackService: PaystackService,
    private readonly prisma: PrismaService,
  ) {}

  async signup(dto: SignupDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    let user;
    try {
      user = await this.usersService.create({
        ...dto,
        password: hashed,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        throw new Error(`User with this ${err.meta.target} already exists`);
      }
      throw err;
    }

    // find wallet created automatically with user
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    // if user provided bank details → create Paystack subaccount + recipient
    if (dto.bankCode && dto.accountNumber && wallet) {
      try {
        const businessName =
          dto.firstName && dto.lastName
            ? `${dto.firstName} ${dto.lastName}`
            : dto.username;

        // 1. Create subaccount
        const subaccount = await this.paystackService.createSubaccount({
          business_name: businessName,
          bank_code: dto.bankCode,
          account_number: dto.accountNumber,
          percentage_charge: 0,
        });

        // 2. Create transfer recipient
        const recipient = await this.paystackService.createTransferRecipient({
          type: 'nuban',
          name: businessName,
          bank_code: dto.bankCode,
          account_number: dto.accountNumber,
          currency: 'NGN',
        });

        // 3. Save both in wallet
        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            paystackSubaccountCode: subaccount.subaccount_code,
            paystackAccountNumber: subaccount.account_number,
            paystackBankName: subaccount.bank_name,
            paystackBusinessName: subaccount.business_name,
            paystackRecipientCode: recipient.recipient_code, // 👈 store this too
          },
        });

        this.logger.log(
          `Created Paystack subaccount (${subaccount.subaccount_code}) and recipient (${recipient.recipient_code}) for user ${user.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to create Paystack integration for user ${user.id}`,
          err.stack,
        );
      }
    }

    // 🔑 generate JWT
    const tokenPayload = await this.signToken(user.id, user.email);

    // enriched response
    return {
      ...tokenPayload,
      user: {
        ...tokenPayload.user,
        firstname: user.firstName,
        lastname: user.lastName,
        username: user.username,
      },
      wallet: wallet
        ? {
            id: wallet.id,
            balance: wallet.balance,
            subaccountCode: wallet.paystackSubaccountCode,
            accountNumber: wallet.paystackAccountNumber,
            bankName: wallet.paystackBankName,
            recipientCode: wallet.paystackRecipientCode, // 👈 include in response
          }
        : null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('No account found with this email');
    }

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) {
      throw new UnauthorizedException('Incorrect password, please try again');
    }

    // Fetch wallet info
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    // Generate JWT token
    const tokenPayload = await this.signToken(user.id, user.email);

    // Return enriched response
    return {
      ...tokenPayload,
      user: {
        ...tokenPayload.user,
        firstname: user.firstName,
        lastname: user.lastName,
        username: user.username,
      },
      wallet: wallet
        ? {
            id: wallet.id,
            balance: wallet.balance,
            subaccountCode: wallet.paystackSubaccountCode,
            accountNumber: wallet.paystackAccountNumber,
            bankName: wallet.paystackBankName,
            businessName: wallet.paystackBusinessName,
          }
        : null,
    };
  }

  private async signToken(userId: string, email: string) {
    const payload = { sub: userId, email };
    const token = await this.jwtService.signAsync(payload);
    return {
      access_token: token,
      user: {
        id: userId,
        email,
      },
    };
  }
}
