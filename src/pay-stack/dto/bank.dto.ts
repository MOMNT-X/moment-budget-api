import { IsOptional, IsString, Length } from 'class-validator';

export class GetBanksDto {
  @IsOptional()
  @IsString()
  @Length(2, 2, { message: 'Country code must be exactly 2 characters' })
  countryCode?: string = 'NG';
}