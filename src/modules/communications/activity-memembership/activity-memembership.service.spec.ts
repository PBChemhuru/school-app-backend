import { Test, TestingModule } from '@nestjs/testing';
import { ActivityMemembershipService } from './activity-memembership.service';

describe('ActivityMemembershipService', () => {
  let service: ActivityMemembershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityMemembershipService],
    }).compile();

    service = module.get<ActivityMemembershipService>(ActivityMemembershipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
