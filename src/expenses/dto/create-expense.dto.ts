import { IsString, IsNumber, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';

export class CreateExpenseDto {
  @IsString()
  @IsNotEmpty()
  categoryId: string;

  @IsNumber()
  amount: number;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsString()
  note?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  userId: string;
}
