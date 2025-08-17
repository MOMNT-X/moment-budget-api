import { IsInt, Min } from 'class-validator';
export class WithdrawDto {
  @IsInt() @Min(100) amount!: number; // kobo
}