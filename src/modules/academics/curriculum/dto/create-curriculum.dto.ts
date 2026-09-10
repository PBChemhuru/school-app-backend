// src/modules/academics/curriculum/dto/create-curriculum.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class CreateCurriculumDto {
  @ApiProperty({
    description: 'Subject ID',
    example: 'subject-123',
  })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'class-123',
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: 'Teacher ID',
    example: 'teacher-123',
  })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;

  @ApiProperty({
    description: 'Academic Year ID',
    example: 'academic-year-123',
  })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({
    description: 'Learning objectives for this subject-class-term',
    example:
      'Students should be able to solve quadratic equations by end of term',
    required: false,
  })
  @IsString()
  @IsOptional()
  learningObjectives?: string;

  @ApiProperty({
    description: 'Additional notes',
    example: 'Focus on algebra and geometry this term',
    required: false,
  })
  @IsString()
  @IsOptional()
  notes?: string;
}
