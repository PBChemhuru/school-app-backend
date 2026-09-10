import { Module } from '@nestjs/common';
import { AcademicYearService } from './academic-year.service';
import { AcademicYearController } from './academic-year.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';
import { TermModule } from '../term/term.module';
import { SubjectModule } from '../subject/subject.module';

@Module({
  imports: [PrismaModule, AuthModule, TermModule, SubjectModule],
  controllers: [AcademicYearController],
  providers: [AcademicYearService],
  exports: [AcademicYearModule, TermModule, SubjectModule],
})
export class AcademicYearModule {}
