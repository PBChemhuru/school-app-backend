import { ApiProperty } from '@nestjs/swagger';
import { TeacherEntity } from '../../teacher/entities/teacher.entity';
import { ParentEntity } from '../../parent/entities/parent.entity';
import { StudentEntity } from '../../student/entities/student.entity';
import { Role, UserStatus } from '@prisma/client';

export class UserEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  firstName!: string;

  @ApiProperty()
  lastName!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  phoneNumber?: string | null;

  @ApiProperty({
    enum: Role,
  })
  role!: Role;

  @ApiProperty({
    enum: UserStatus,
  })
  status!: UserStatus;

  @ApiProperty()
  schoolCode!: string;

  @ApiProperty()
  twoFactorEnabled!: boolean;

  @ApiProperty()
  emailVerified!: boolean;

  @ApiProperty({
    required: false,
    nullable: false,
  })
  dateOfBirth?: Date | null;

  @ApiProperty({
    required: false,
    nullable: false,
  })
  gender?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  profilePhoto?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  lastLogin?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    required: false,
    type: () => StudentEntity,
  })
  studentProfile?: StudentEntity | null;

  @ApiProperty({
    required: false,
    type: () => TeacherEntity,
  })
  teacherProfile?: TeacherEntity | null;

  @ApiProperty({
    required: false,
    type: () => ParentEntity,
  })
  parentProfile?: ParentEntity | null;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
