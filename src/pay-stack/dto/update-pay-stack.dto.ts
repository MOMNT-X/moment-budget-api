import { PartialType } from '@nestjs/mapped-types';
import { CreatePayStackDto } from './create-pay-stack.dto';

export class UpdatePayStackDto extends PartialType(CreatePayStackDto) {}
