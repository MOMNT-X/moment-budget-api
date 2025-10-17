// src/budgets/dto/update-budget.dto.ts

import { IsNumber, IsString, IsDateString, IsBoolean, IsEnum, IsOptional, Min } from 'class-validator';

export class UpdateBudgetDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  amount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsBoolean()
  recurring?: boolean;

  @IsOptional()
  @IsEnum(['DAILY', 'WEEKLY', 'MONTHLY'])
  frequency?: 'DAILY' | 'WEEKLY' | 'MONTHLY';
}