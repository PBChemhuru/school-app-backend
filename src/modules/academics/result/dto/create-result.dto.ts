// src/modules/academics/result/dto/create-result.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsNumber,
  Min,
  Max,
} from 'class-validator';

export class CreateResultDto {
  @ApiProperty({ description: 'Student ID', example: 'student-123' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ description: 'Subject ID', example: 'subject-123' })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({ description: 'Teacher ID', example: 'teacher-123' })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({ description: 'Term ID', example: 'term-123' })
  @IsUUID()
  termId!: string;

  @ApiProperty({
    description: 'Score (0-100)',
    example: 78,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  score!: number;

  @ApiProperty({
    description: 'Optional remarks',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
