import { IsInt, IsOptional, IsString, Min, IsEmail } from 'class-validator';

export class DepositDto {
  @IsInt({ message: 'Amount must be an integer (Naira only, decimals not allowed)' })
  @Min(1, { message: 'Minimum deposit is ₦1' })
  amount: number; // Accept in Naira, will convert to kobo in service

  @IsOptional()
  @IsString()
  description?: string;

  @IsEmail()
  email: string;
}


