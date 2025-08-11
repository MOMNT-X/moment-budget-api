import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../user/user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { PaystackService } from '../pay-stack/pay-stack.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly paystackService: PaystackService,
  ) {}

  async signup(dto: SignupDto) {
    // hash password
    const hashed = await bcrypt.hash(dto.password, 10);

    // create user
    const user = await this.usersService.create({
      ...dto,
      password: hashed,
    });

    // if user has provided bank details, create Paystack subaccount
    if (dto.bankCode && dto.accountNumber) {
      try {
        const businessName = dto.firstName && dto.lastName
          ? `${dto.firstName} ${dto.lastName}`
          : dto.username;

        const subaccountCode = await this.paystackService.createSubaccount(
          businessName,
          dto.bankCode,
          dto.accountNumber,
        );

        await this.usersService.update(user.id, {
          paystackSubaccount: subaccountCode,
        });

        this.logger.log(`Created Paystack subaccount for user ${user.id}`);
      } catch (err) {
        this.logger.error(`Failed to create Paystack subaccount for user ${user.id}`, err.stack);
        // optionally throw if you want to prevent signup without Paystack
        // throw new BadRequestException('Error creating Paystack subaccount');
      }
    }

    return this.signToken(user.id, user.email);
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
