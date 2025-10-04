import { IsString, IsNumber, IsDateString, IsOptional, Min } from 'class-validator';

export class CreateGoalDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(1, { message: 'Target amount must be greater than 0' })
  targetAmount: number;

  @IsDateString()
  @IsOptional()
  deadline?: string;

  @IsString()
  @IsOptional()
  categoryId?: string;
}
