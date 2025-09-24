import { IsOptional, IsString, IsNumber } from 'class-validator';

export class FilterExpenseDto {
  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsNumber()
  minAmount?: number;

  @IsOptional()
  @IsNumber()
  maxAmount?: number;

  @IsOptional()
  @IsString()
  month?: string; // e.g. '2024-07'
}