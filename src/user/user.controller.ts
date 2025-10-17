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
  @Patch('income')
  updateIncome(@GetUser('id') userId: string, @Body() dto: UpdateIncomeDto) {
    return this.userService.updateIncome(userId, dto.income);
  }
  @UseGuards(JwtGuard)
  @Patch('update-profile')
  update(@GetUser('userId') userId: string, @Body() dto: UpdateUserDto) {
    return this.userService.update(userId, dto);
  }
}
