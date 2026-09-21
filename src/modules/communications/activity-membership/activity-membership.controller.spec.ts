import { Test, TestingModule } from '@nestjs/testing';
import { ActivityMembershipController } from './activity-membership.controller';
import { ActivityMembershipService } from './activity-membership.service';

describe('ActivityMembershipController', () => {
  let controller: ActivityMembershipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityMembershipController],
      providers: [ActivityMembershipService],
    }).compile();

    controller = module.get<ActivityMembershipController>(ActivityMembershipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
