import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service'; // Add this import
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { PrismaService } from '../prisma/prisma.service';
import { InternalServerErrorException } from '@nestjs/common/exceptions';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly paystackService: PaystackService,
    private readonly prisma: PrismaService,
    private readonly walletService: WalletService, // Add this injection
  ) {}

  async signup(dto: SignupDto) {
    const hashed = await bcrypt.hash(dto.password, 10);

    let user;
    let wallet: any = null; // Fix typing issue

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

    // Create wallet for the user
    try {
      if (dto.bankCode && dto.accountNumber) {
        // If user provided bank details, create wallet with Paystack integration
        const businessName =
          dto.firstName && dto.lastName
            ? `${dto.firstName} ${dto.lastName}`
            : dto.username;

        wallet = await this.walletService.createWalletForUser(
          user.id,
          user.email,
          businessName,
          dto.bankCode,
          dto.accountNumber,
        );

        this.logger.log(
          `Created wallet with Paystack integration for user ${user.id}`,
        );
      } else {
        // Create basic wallet without Paystack integration
        wallet = await this.prisma.wallet.create({
          data: {
            userId: user.id,
            balance: 0, // starting balance in kobo
            currency: 'NGN',
          },
        });

        this.logger.log(`Created basic wallet for user ${user.id}`);
      }
    } catch (err) {
      this.logger.error(
        `Failed to create wallet for user ${user.id}`,
        err.stack,
      );
      throw new InternalServerErrorException('Wallet creation failed');
    }
    // You might want to decide if you want to delete the user if wallet creation fails
    // or just continue without a wallet

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
            recipientCode: wallet.paystackRecipientCode,
          }
        : null,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) {
      throw new UnauthorizedException('No account found with this email');
    }

    if (!user.password) {
      throw new UnauthorizedException('Invalid credentials');
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
