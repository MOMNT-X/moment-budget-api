import { Controller, Get, Body, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateIncomeDto } from '../income/dto/update-income.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { GetUser } from './decorators/get-user.decorator';
import { UpdateUserDto } from './dto/update-user.dto';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UsersService) {}

  @UseGuards(JwtGuard)
  /* @Put('income')
  async updateIncome(@Req() req, @Body('income') income: number) {
    return this.userService.updateIncome(req.user.sub, income);
  } */
  @Patch('income')
  updateIncome(@GetUser('id') userId: string, @Body() dto: UpdateIncomeDto) {
    return this.userService.updateIncome(userId, dto.income);
  }

  @Patch('update-profile')
  update(@GetUser('id') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
