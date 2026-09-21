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
import { AcademicYearModule } from './modules/academics/academic-year/academic-year.module';
import { TermModule } from './modules/academics/term/term.module';
import { SubjectModule } from './modules/academics/subject/subject.module';
import { CurriculumModule } from './modules/academics/curriculum/curriculum.module';
import { TimetableModule } from './modules/academics/timetable/timetable.module';
import { ResultModule } from './modules/academics/result/result.module';
import { AttendanceModule } from './modules/academics/attendance/attendance.module';
import { TransferHistoryModule } from './modules/academics/transfer-history/transfer-history.module';
import { SchoolClassModule } from './modules/academics/schoolclass/schoolclass.module';
import { ActivityModule } from './modules/communications/activity/activity.module';
import { EventModule } from './modules/communications/event/event.module';
import { AnnouncementModule } from './modules/communications/announcement/announcement.module';
import { ActivityMembershipModule } from './modules/communications/activity-membership/activity-membership.module';

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
    AcademicYearModule,
    TermModule,
    SubjectModule,
    CurriculumModule,
    TimetableModule,
    ResultModule,
    AttendanceModule,
    TransferHistoryModule,
    SchoolClassModule,
    ActivityModule,
    ActivityMembershipModule,
    EventModule,
    AnnouncementModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
