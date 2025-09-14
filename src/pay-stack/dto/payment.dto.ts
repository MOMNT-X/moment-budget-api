import {  IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class InitializePaymentDto {
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  subaccountCode?: string;
}