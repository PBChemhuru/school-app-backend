// src/modules/academics/attendance/dto/create-attendance.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
} from 'class-validator';

export class CreateAttendanceDto {
  @ApiProperty({ description: 'Student ID', example: 'student-123' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    description: 'Date of attendance (ISO string)',
    example: '2026-01-15T00:00:00Z',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Whether the student was present',
    example: true,
  })
  @IsBoolean()
  present!: boolean;

  @ApiProperty({
    description: 'Optional remarks (e.g., "Sick", "Late")',
    example: 'Arrived late',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
