// src/modules/academics/curriculum/dto/update-curriculum.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID } from 'class-validator';

export class UpdateCurriculumDto {
  @ApiProperty({
    description: 'Teacher ID',
    example: 'teacher-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

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
