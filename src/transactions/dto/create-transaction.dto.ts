import { IsString, IsNumber, IsEnum, IsOptional, IsEmail } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsEmail()
  @IsString()
  email: string;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  categoryId: string;

  @IsOptional()
  date?: string;
}
