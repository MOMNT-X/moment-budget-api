import { IsNumber } from 'class-validator';

export class UpdateIncomeDto {
  @IsNumber()
  income: number;
}
