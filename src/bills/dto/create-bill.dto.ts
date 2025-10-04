import { IsString, IsNumber, IsDateString, IsBoolean, IsOptional, Min } from 'class-validator';

export class CreateBillDto {
  @IsString()
  categoryId: string;

  @IsNumber()
  @Min(1, { message: 'Amount must be greater than 0' })
  amount: number;

  @IsString()
  description: string;

  @IsDateString()
  dueDate: string;

  @IsBoolean()
  @IsOptional()
  autoPay?: boolean;

  @IsString()
  @IsOptional()
  recipientAccountNumber?: string;

  @IsString()
  @IsOptional()
  recipientAccountName?: string;

  @IsString()
  @IsOptional()
  recipientBankCode?: string;

  @IsString()
  @IsOptional()
  recipientBankName?: string;

  @IsString()
  @IsOptional()
  beneficiaryId?: string;
}
