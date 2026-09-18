import { Module } from '@nestjs/common';
import { SchoolClassService } from './schoolclass.service';
import { SchoolClassController } from './schoolclass.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [SchoolClassController],
  providers: [SchoolClassService],
  exports: [SchoolClassService],
})
export class SchoolClassModule {}
