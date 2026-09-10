// src/modules/teacher/dto/update-teacher.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';
import { EmploymentStatus } from '@prisma/client';

export class UpdateTeacherDto {
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

  @ApiProperty({
    description: 'Employment status',
    enum: EmploymentStatus,
    required: false,
  })
  @IsEnum(EmploymentStatus)
  @IsOptional()
  employmentStatus?: EmploymentStatus;
}
