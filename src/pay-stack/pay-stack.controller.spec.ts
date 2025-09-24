import { Test, TestingModule } from '@nestjs/testing';
import { PaystackController } from './pay-stack.controller';
import { PaystackService } from './pay-stack.service';

describe('PayStackController', () => {
  let controller: PaystackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaystackController],
      providers: [PaystackService],
    }).compile();

    controller = module.get<PaystackController>(PaystackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
