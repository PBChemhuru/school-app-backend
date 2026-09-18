import { Test, TestingModule } from '@nestjs/testing';
import { ActivityMemembershipController } from './activity-memembership.controller';
import { ActivityMemembershipService } from './activity-memembership.service';

describe('ActivityMemembershipController', () => {
  let controller: ActivityMemembershipController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ActivityMemembershipController],
      providers: [ActivityMemembershipService],
    }).compile();

    controller = module.get<ActivityMemembershipController>(ActivityMemembershipController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
