import { ApiProperty } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { UserEntity } from '../../user/entities/user.entity';
//import { SchoolClassEntity } from '../../school-classes/entities/school-class.entity';
//import { AcademicYearEntity } from '../../academic-years/entities/academic-year.entity';

export class StudentEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  admissionNumber!: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  gender?: string | null;

  @ApiProperty({
    enum: EnrollmentStatus,
  })
  enrollmentStatus!: EnrollmentStatus;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  currentClassId?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  academicYearId?: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    required: false,
    type: () => UserEntity,
  })
  user?: UserEntity;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  address?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  medicalNotes?: string | null;

  /*@ApiProperty({
    required: false,
    type: () => SchoolClassEntity,
  })
  currentClass?: SchoolClassEntity;

  @ApiProperty({
    required: false,
    type: () => AcademicYearEntity,
  })
  academicYear?: AcademicYearEntity;*/

  constructor(partial: Partial<StudentEntity>) {
    Object.assign(this, partial);
  }
}
