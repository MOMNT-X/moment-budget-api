import { IsString, IsOptional } from 'class-validator';

export class PayBillTransferDto {
  @IsString()
  @IsOptional()
  recipientAccountNumber?: string;

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
