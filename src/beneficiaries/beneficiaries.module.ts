import { Module } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { BeneficiariesController } from './beneficiaries.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { PaystackModule } from '../pay-stack/pay-stack.module';

@Module({
  imports: [PrismaModule, PaystackModule],
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService],
  exports: [BeneficiariesService],
})
export class BeneficiariesModule {}
