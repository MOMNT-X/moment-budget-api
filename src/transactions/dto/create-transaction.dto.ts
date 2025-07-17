import { IsString, IsNumber, IsEnum, IsOptional } from 'class-validator';
import { TransactionType } from '../entities/transaction.entity';

export class CreateTransactionDto {
  @IsString()
  description: string;

  @IsNumber()
  amount: number;

  @IsEnum(TransactionType)
  type: TransactionType;

  @IsString()
  categoryId: string;

  @IsOptional()
  date?: string;
}
