// src/modules/academics/result/dto/enter-scores.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class StudentScoreDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-123',
  })
  @IsUUID()
  studentId!: string;

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
    example: 'Strong improvement this term',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class EnterScoresDto {
  @ApiProperty({
    description: 'Subject ID',
    example: 'subject-123',
  })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'class-123',
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: 'Array of student scores',
    type: [StudentScoreDto],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => StudentScoreDto)
  scores!: StudentScoreDto[];
}
