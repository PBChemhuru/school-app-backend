import { Test, TestingModule } from '@nestjs/testing';
import { ActivityMembershipService } from './activity-membership.service';

describe('ActivityMembershipService', () => {
  let service: ActivityMembershipService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ActivityMembershipService],
    }).compile();

    service = module.get<ActivityMembershipService>(ActivityMembershipService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
