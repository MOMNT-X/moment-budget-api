import { IsNumber, IsString, Min } from 'class-validator';

export class PayDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  description: string;
}
