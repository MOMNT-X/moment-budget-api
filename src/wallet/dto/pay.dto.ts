import { IsInt, IsString, Min } from 'class-validator';

export class PayDto {
  @IsString()
  categoryId: string;

  @IsInt({
    message: 'Amount must be an integer (Naira only, decimals not allowed)',
  })
  @Min(1, { message: 'Minimum payment is ₦1' })
  amount: number; // Accept in Naira, will convert to kobo in service

  @IsString()
  description: string;
}
