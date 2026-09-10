// src/modules/academics/class/dto/assign-student.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsArray, IsOptional, ArrayMinSize } from 'class-validator';

export class AssignStudentDto {
  @ApiProperty({
    description: 'Single student ID to assign',
    example: 'student-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({
    description: 'Multiple student IDs to assign (bulk)',
    example: ['student-123', 'student-456'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  studentIds?: string[];
}
