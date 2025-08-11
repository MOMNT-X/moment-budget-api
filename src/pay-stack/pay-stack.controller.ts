import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { PayStackService } from './pay-stack.service';
import { CreatePayStackDto } from './dto/create-pay-stack.dto';
import { UpdatePayStackDto } from './dto/update-pay-stack.dto';

@Controller('pay-stack')
export class PayStackController {
  constructor(private readonly payStackService: PayStackService) {}

  @Post()
  create(@Body() createPayStackDto: CreatePayStackDto) {
    return this.payStackService.create(createPayStackDto);
  }

  @Get()
  findAll() {
    return this.payStackService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.payStackService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updatePayStackDto: UpdatePayStackDto) {
    return this.payStackService.update(+id, updatePayStackDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.payStackService.remove(+id);
  }
}
