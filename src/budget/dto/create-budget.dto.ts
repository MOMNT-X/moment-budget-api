import {
  IsNotEmpty,
  IsString,
  IsNumber,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsEnum,
} from 'class-validator';
import { RecurrenceFrequency } from '@prisma/client';

export class CreateBudgetDto {
  @IsNotEmpty()
  @IsString()
  categoryId: string;

  @IsNotEmpty()
  @IsNumber()
  amount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsBoolean()
  recurring: boolean;
 
  @IsEnum(RecurrenceFrequency)
  @IsOptional()
  frequency?: RecurrenceFrequency;
}
