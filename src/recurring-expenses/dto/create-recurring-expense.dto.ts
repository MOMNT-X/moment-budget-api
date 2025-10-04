import { IsString, IsNumber, IsEnum, IsDateString, IsBoolean, IsOptional, Min } from 'class-validator';

export enum RecurrenceFrequency {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  YEARLY = 'YEARLY'
}

export class CreateRecurringExpenseDto {
  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsString()
  description: string;

  @IsString()
  categoryId: string;

  @IsEnum(RecurrenceFrequency)
  frequency: RecurrenceFrequency;

  @IsDateString()
  nextDueDate: string;

  @IsDateString()
  @IsOptional()
  endDate?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
