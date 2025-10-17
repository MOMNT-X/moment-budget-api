import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/user.service';
import { WalletService } from '../wallet/wallet.service';
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
    private readonly walletService: WalletService,
  ) {}

  async signup(dto: SignupDto) {
    try {
      const hashed = await bcrypt.hash(dto.password, 10);
      let user;
      let wallet: any = null;

      // 👤 Create user
      try {
        user = await this.usersService.create({
          ...dto,
          password: hashed,
        });
      } catch (err: any) {
        this.logger.error(`User creation failed: ${err.message}`, err.stack);

        // Prisma duplicate record error
        if (err.code === 'P2002') {
          throw new ConflictException(
            `A user with this ${err.meta?.target?.join(', ') || 'credential'} already exists`,
          );
        }

        // Handle other Prisma errors
        if (err.code) {
          throw new BadRequestException(`Database error: ${err.message}`);
        }

        throw new InternalServerErrorException(
          'Failed to create user. Please try again later.',
        );
      }

      // 💳 Create wallet
      try {
        if (dto.bankCode && dto.accountNumber) {
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

          this.logger.log(`Wallet created via Paystack for user ${user.id}`);
        } else {
          wallet = await this.prisma.wallet.create({
            data: {
              userId: user.id,
              balance: 0,
              currency: 'NGN',
            },
          });
          this.logger.log(`Basic wallet created for user ${user.id}`);
        }
      } catch (err: any) {
        this.logger.error(
          `Wallet creation failed for user ${user.id}: ${err.message}`,
          err.stack,
        );

        // Propagate specific failure reasons if Paystack or DB fails
        if (err.response?.data?.message) {
          throw new BadRequestException(
            `Wallet creation failed: ${err.response.data.message}`,
          );
        }

        throw new InternalServerErrorException(
          'Failed to create wallet. Please verify your bank details and try again.',
        );
      }

      // 🔑 JWT payload
      const tokenPayload = await this.signToken(user.id, user.email);

      // ✅ Return enriched, consistent response
      return {
        ...tokenPayload,
        user: {
          id: user.id,
          email: user.email,
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
    } catch (error) {
      this.logger.error(`Signup process failed: ${error.message}`, error.stack);

      // Re-throw if already handled with an HTTP exception
      if (
        error instanceof UnauthorizedException ||
        error instanceof ConflictException ||
        error instanceof BadRequestException ||
        error instanceof InternalServerErrorException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'An unexpected error occurred during signup.',
      );
    }
  }

  async login(dto: LoginDto) {
    try {
      const user = await this.usersService.findByEmail(dto.email);
      if (!user) {
        throw new UnauthorizedException(
          'No account found with this email address.',
        );
      }

      if (!user.password) {
        throw new UnauthorizedException('Invalid login credentials.');
      }

      const valid = await bcrypt.compare(dto.password, user.password);
      if (!valid) {
        throw new UnauthorizedException(
          'Incorrect password. Please try again.',
        );
      }

      const wallet = await this.prisma.wallet.findUnique({
        where: { userId: user.id },
      });

      const tokenPayload = await this.signToken(user.id, user.email);

      return {
        ...tokenPayload,
        user: {
          id: user.id,
          email: user.email,
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
    } catch (error) {
      this.logger.error(`Login failed: ${error.message}`, error.stack);

      if (error instanceof UnauthorizedException) throw error;

      throw new InternalServerErrorException(
        'An unexpected error occurred during login.',
      );
    }
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
