import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UserService {
 constructor(private readonly) {}

 async create(dto: CreateUserDto) {
  const user = this.userRepository.create(dto);
  return this.userRepository.save(user);
}

async findByEmail(email: string) {
  return this.userRepository.findOne({ where: { email } });
}
