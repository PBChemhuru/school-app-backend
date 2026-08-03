import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/Users/user/user.module';
import { StudentModule } from './modules/Users/student/student.module';
import { ParentModule } from './modules/Users/parent/parent.module';
import { TeacherModule } from './modules/Users/teacher/teacher.module';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './modules/admin/admin.module';

@Module({
  imports: [
    PrismaModule,
    UserModule,
    AuthModule,
    StudentModule,
    ParentModule,
    TeacherModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AdminModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
