import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';
import { TransactionType } from '@prisma/client';
import { Type } from 'class-transformer';

export class FilterTransactionDto {
  @IsOptional()
  @IsEnum(TransactionType)
  type?: TransactionType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  startDate?: string; // ISO string format

  @IsOptional()
  @IsString()
  endDate?: string;
}
