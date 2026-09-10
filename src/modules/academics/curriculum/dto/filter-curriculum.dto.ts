// src/modules/academics/curriculum/dto/filter-curriculum.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsString } from 'class-validator';

export class FilterCurriculumDto {
  @ApiProperty({
    description: 'Filter by subject ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({
    description: 'Filter by class ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Filter by teacher ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({
    description: 'Filter by term ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  termId?: string;

  @ApiProperty({
    description: 'Filter by academic year ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({
    description: 'Search by learning objectives or notes',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}
