// src/modules/academics/class/dto/promote-students.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class PromoteStudentsDto {
  @ApiProperty({
    description: 'Source class ID (where students come from)',
    example: 'class-123',
  })
  @IsUUID()
  sourceClassId!: string;

  @ApiProperty({
    description: 'Target class ID (where students go to)',
    example: 'class-456',
  })
  @IsUUID()
  targetClassId!: string;

  @ApiProperty({
    description: 'New academic year ID for the promotion',
    example: 'academic-year-2027',
  })
  @IsUUID()
  newAcademicYearId!: string;

  @ApiProperty({
    description:
      'Specific student IDs to promote. If omitted or empty, ALL students in the source class will be promoted.',
    example: ['student-1', 'student-2'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  studentIds?: string[];
}
