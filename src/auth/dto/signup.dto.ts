import {
  IsEmail,
  IsString,
  MinLength,
  Matches,
  IsOptional,
} from 'class-validator';

export class SignupDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  firstName: string;
  @IsString()
  lastName: string;

  @IsString()
  username: string;

  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankCode?: string; // Paystack uses numeric bank code

  @IsOptional()
  @Matches(/^\d{10}$/, { message: 'Account number must be 10 digits' })
  accountNumber?: string;
}
