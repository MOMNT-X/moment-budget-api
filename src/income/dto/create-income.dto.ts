import { IsString, IsNumber, IsOptional, IsDateString } from 'class-validator';

export class CreateIncomeDto {
  @IsNumber()
  amount: number;

  @IsString()
  source: string;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  description?: string;
}
