// src/modules/academics/attendance/dto/filter-attendance.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsUUID,
  IsBoolean,
  IsDateString,
  IsString,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FilterAttendanceDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Start date (ISO string)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date (ISO string)',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ description: 'Filter by present status', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  present?: boolean;

  @ApiProperty({ description: 'Search in remarks', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
