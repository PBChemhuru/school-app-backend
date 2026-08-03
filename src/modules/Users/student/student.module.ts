import { Module } from '@nestjs/common';
import { StudentService } from './student.service';
import { StudentController } from './student.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthService } from 'src/modules/auth/auth.service';
import { JwtService } from '@nestjs/jwt';

@Module({
  controllers: [StudentController],
  providers: [StudentService, PrismaService, AuthService, JwtService],
})
export class StudentModule {}
