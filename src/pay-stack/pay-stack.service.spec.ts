import { Test, TestingModule } from '@nestjs/testing';
import { PayStackService } from './pay-stack.service';

describe('PayStackService', () => {
  let service: PayStackService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayStackService],
    }).compile();

    service = module.get<PayStackService>(PayStackService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
