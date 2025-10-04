import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackService } from '../pay-stack/pay-stack.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';

@Injectable()
export class BeneficiariesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystack: PaystackService,
  ) {}

  async create(userId: string, dto: CreateBeneficiaryDto) {
    const resolvedAccount = await this.paystack.resolveAccountNumber(
      dto.accountNumber,
      dto.bankCode,
    );

    if (!resolvedAccount || !resolvedAccount.account_name) {
      throw new BadRequestException('Could not verify account details');
    }

    const recipient = await this.paystack.createTransferRecipient({
      type: 'nuban',
      name: resolvedAccount.account_name,
      bank_code: dto.bankCode,
      account_number: dto.accountNumber,
    });

    return this.prisma.beneficiary.create({
      data: {
        userId,
        name: dto.name,
        accountNumber: dto.accountNumber,
        bankCode: dto.bankCode,
        bankName: dto.bankName,
        paystackRecipientCode: recipient.recipient_code,
      },
    });
  }

  async findAll(userId: string) {
    return this.prisma.beneficiary.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(userId: string, id: string) {
    const beneficiary = await this.prisma.beneficiary.findFirst({
      where: { id, userId },
    });

    if (!beneficiary) {
      throw new NotFoundException('Beneficiary not found');
    }

    return beneficiary;
  }

  async update(userId: string, id: string, dto: UpdateBeneficiaryDto) {
    await this.findOne(userId, id);

    return this.prisma.beneficiary.update({
      where: { id },
      data: dto,
    });
  }

  async remove(userId: string, id: string) {
    await this.findOne(userId, id);

    return this.prisma.beneficiary.delete({
      where: { id },
    });
  }
}
