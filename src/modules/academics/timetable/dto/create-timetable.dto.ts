// src/modules/academics/timetable/dto/create-timetable.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsDateString,
} from 'class-validator';

export class CreateTimetableDto {
  @ApiProperty({ description: 'Class ID', example: 'class-123' })
  @IsUUID()
  classId!: string;

  @ApiProperty({ description: 'Curriculum ID', example: 'curriculum-123' })
  @IsUUID()
  curriculumId!: string;

  @ApiProperty({ description: 'Teacher ID', example: 'teacher-123' })
  @IsUUID()
  teacherId!: string;

  @ApiProperty({
    description: 'Room override (optional)',
    example: 'Room 102',
    required: false,
  })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({
    description: 'Day of week (0 = Sunday, 1 = Monday, ..., 6 = Saturday)',
    example: 1,
    minimum: 0,
    maximum: 6,
  })
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({
    description: 'Start time (ISO string)',
    example: '2026-01-15T08:00:00Z',
  })
  @IsDateString()
  startTime!: string;

  @ApiProperty({
    description: 'End time (ISO string)',
    example: '2026-01-15T09:00:00Z',
  })
  @IsDateString()
  endTime!: string;
}
