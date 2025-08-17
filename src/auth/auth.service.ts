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
    // hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // create user (UserService will auto-create wallet too)
    const user = await this.usersService.create({
      ...dto,
      password: hashed,
    });

    // find wallet that was created automatically with the user
    const wallet = await this.prisma.wallet.findUnique({
      where: { userId: user.id },
    });

    // if user has provided bank details, create Paystack subaccount
    if (dto.bankCode && dto.accountNumber && wallet) {
      try {
        const businessName =
          dto.firstName && dto.lastName
            ? `${dto.firstName} ${dto.lastName}`
            : dto.username;

        const subaccount = await this.paystackService.createSubaccount({
          business_name: businessName,
          bank_code: dto.bankCode,
          account_number: dto.accountNumber,
          percentage_charge: 0,
        });

        await this.prisma.wallet.update({
          where: { id: wallet.id },
          data: {
            paystackSubaccountCode: subaccount.subaccount_code,
            paystackAccountNumber: subaccount.account_number,
            paystackBankName: subaccount.bank_name,
            paystackBusinessName: subaccount.business_name,
          },
        });

        this.logger.log(
          `Created Paystack subaccount for user ${user.id}: ${subaccount.subaccount_code}`,
        );
      } catch (err) {
        this.logger.error(
          `Failed to create Paystack subaccount for user ${user.id}`,
          err.stack,
        );
        // optionally throw here if subaccount creation is mandatory
      }
    }

    return this.signToken(user.id, user.email );
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmail(dto.email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    return this.signToken(user.id, user.email);
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
