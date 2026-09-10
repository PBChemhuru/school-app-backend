// src/modules/academics/attendance/dto/bulk-mark-attendance.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsUUID,
  IsBoolean,
  IsOptional,
  IsString,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class BulkAttendanceItemDto {
  @ApiProperty({ description: 'Student ID' })
  @IsUUID()
  studentId!: string;

  @ApiProperty({ description: 'Whether present' })
  @IsBoolean()
  present!: boolean;

  @ApiProperty({ description: 'Optional remarks', required: false })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkMarkAttendanceDto {
  @ApiProperty({
    description: 'Date of attendance (ISO string)',
    example: '2026-01-15T00:00:00Z',
  })
  @IsDateString()
  date!: string;

  @ApiProperty({
    description: 'Class ID (optional - used to mark whole class)',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Array of student attendance records',
    type: [BulkAttendanceItemDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceItemDto)
  records!: BulkAttendanceItemDto[];
}
