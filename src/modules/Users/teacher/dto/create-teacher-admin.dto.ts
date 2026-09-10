// src/modules/teacher/dto/create-teacher.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, IsObject } from 'class-validator';
import { EmploymentStatus } from '@prisma/client';

export class CreateTeacherDto {
  @ApiProperty({
    description: 'Teacher qualifications (JSON)',
    required: false,
  })
  @IsObject()
  @IsOptional()
  qualifications?: Record<string, any>;

  @ApiProperty({ description: 'Teacher bio', required: false })
  @IsString()
  @IsOptional()
  bio?: string;

  @ApiProperty({ description: 'Hire date', required: false })
  @IsDateString()
  @IsOptional()
  hireDate?: string;

  @ApiProperty({
    description: 'Employment status',
    enum: EmploymentStatus,
    default: EmploymentStatus.ACTIVE,
    required: false,
  })
  @IsOptional()
  employmentStatus?: EmploymentStatus;
}
