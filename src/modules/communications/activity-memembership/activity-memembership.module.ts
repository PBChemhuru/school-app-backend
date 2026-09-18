import { Module } from '@nestjs/common';
import { ActivityMemembershipService } from './activity-memembership.service';
import { ActivityMemembershipController } from './activity-memembership.controller';

@Module({
  controllers: [ActivityMemembershipController],
  providers: [ActivityMemembershipService],
})
export class ActivityMemembershipModule {}
