import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EnrollmentStatus } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';

export class UpdateStudentAdminDto {
  @ApiProperty()
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  admissionNumber?: string;

  @ApiProperty({
    enum: EnrollmentStatus,
  })
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  enrollmentStatus?: EnrollmentStatus;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  currentClassId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  @IsOptional()
  address?: string;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  @IsOptional()
  medicalNotes?: string;

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
}
