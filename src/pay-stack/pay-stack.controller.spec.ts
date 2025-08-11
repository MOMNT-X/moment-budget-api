import { Test, TestingModule } from '@nestjs/testing';
import { PayStackController } from './pay-stack.controller';
import { PayStackService } from './pay-stack.service';

describe('PayStackController', () => {
  let controller: PayStackController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayStackController],
      providers: [PayStackService],
    }).compile();

    controller = module.get<PayStackController>(PayStackController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
