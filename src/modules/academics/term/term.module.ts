import { Module } from '@nestjs/common';
import { TermService } from './term.service';
import { TermController } from './term.controller';
import { AuthModule } from 'src/modules/auth/auth.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TermController],
  providers: [TermService],
  exports: [TermService],
})
export class TermModule {}
