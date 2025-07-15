import { IsString, IsNumber, IsDateString } from 'class-validator';

export class CreateBudgetDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  amount: number;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
