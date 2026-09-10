import { Module } from '@nestjs/common';
import { TeacherService } from './teacher.service';
import { TeacherController } from './teacher.controller';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from 'src/modules/auth/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { AuthModule } from 'src/modules/auth/auth.module';

@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [TeacherController],
  providers: [TeacherService, PrismaService, AuthService, JwtService],
  exports: [TeacherService],
})
export class TeacherModule {}
