import { IsNumber, IsOptional, IsEnum, Min } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { CreateGoalDto } from './create-goal.dto';

export enum GoalStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  PAUSED = 'PAUSED',
  CANCELLED = 'CANCELLED'
}

export class UpdateGoalDto extends PartialType(CreateGoalDto) {
  @IsNumber()
  @Min(0)
  @IsOptional()
  currentAmount?: number;

  @IsEnum(GoalStatus)
  @IsOptional()
  status?: GoalStatus;
}
