import { ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CreateStudentAdminDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentClassId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  academicYearId?: string;

  @ApiPropertyOptional({
    enum: EnrollmentStatus,
  })
  @IsOptional()
  @IsEnum(EnrollmentStatus)
  enrollmentStatus?: EnrollmentStatus;

  // TODO:
  // Add currentClassId when SchoolClass module is implemented

  // TODO:
  // Add academicYearId when AcademicYear module is implemented
}
