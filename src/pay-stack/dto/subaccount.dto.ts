// create-subaccount.dto.ts
import { IsString, IsEmail, IsNotEmpty, IsOptional, IsNumber } from 'class-validator';

export class CreateSubaccountDto {
  @IsString()
  @IsNotEmpty()
  businessName: string;

  @IsString()
  @IsNotEmpty()
  bankCode: string;

  @IsString()
  @IsNotEmpty()
  accountNumber: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsNumber()
  percentageCharge: number;
}

// init-transaction.dto.ts
export class InitTransactionDto {
  @IsEmail()
  email: string;

  @IsNumber()
  amount: number; // in kobo

  @IsString()
  @IsOptional()
  subaccount?: string;
}
