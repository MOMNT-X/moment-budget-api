import { Controller, Body, Patch, UseGuards } from '@nestjs/common';
import { UsersService } from './user.service';
import { UpdateIncomeDto } from '../income/dto/update-income.dto';
import { JwtGuard } from '../auth/jwt.guard';
import { GetUser } from './decorators/get-user.decorator';

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
}
