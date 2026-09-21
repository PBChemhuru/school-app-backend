import { Module } from '@nestjs/common';
import { ActivityMembershipService } from './activity-membership.service';
import { ActivityMembershipController } from './activity-membership.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [ActivityMembershipController],
  providers: [ActivityMembershipService],
  exports: [ActivityMembershipService],
})
export class ActivityMembershipModule {}
