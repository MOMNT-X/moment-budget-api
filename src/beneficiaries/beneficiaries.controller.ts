import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Req } from '@nestjs/common';
import { BeneficiariesService } from './beneficiaries.service';
import { CreateBeneficiaryDto } from './dto/create-beneficiary.dto';
import { UpdateBeneficiaryDto } from './dto/update-beneficiary.dto';
import { JwtGuard } from '../auth/jwt.guard';

@Controller('beneficiaries')
@UseGuards(JwtGuard)
export class BeneficiariesController {
  constructor(private readonly beneficiariesService: BeneficiariesService) {}

  @Post()
  create(@Req() req, @Body() createBeneficiaryDto: CreateBeneficiaryDto) {
    return this.beneficiariesService.create(req.user.userId, createBeneficiaryDto);
  }

  @Get()
  findAll(@Req() req) {
    return this.beneficiariesService.findAll(req.user.userId);
  }

  @Get(':id')
  findOne(@Req() req, @Param('id') id: string) {
    return this.beneficiariesService.findOne(req.user.userId, id);
  }

  @Patch(':id')
  update(@Req() req, @Param('id') id: string, @Body() updateBeneficiaryDto: UpdateBeneficiaryDto) {
    return this.beneficiariesService.update(req.user.userId, id, updateBeneficiaryDto);
  }

  @Delete(':id')
  remove(@Req() req, @Param('id') id: string) {
    return this.beneficiariesService.remove(req.user.userId, id);
  }
}
