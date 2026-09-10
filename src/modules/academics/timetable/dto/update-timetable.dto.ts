// src/modules/academics/timetable/dto/update-timetable.dto.ts

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

export class UpdateTimetableDto {
  @ApiProperty({ description: 'Class ID', required: false })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({ description: 'Curriculum ID', required: false })
  @IsUUID()
  @IsOptional()
  curriculumId?: string;

  @ApiProperty({ description: 'Teacher ID', required: false })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ description: 'Room override', required: false })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({ description: 'Day of week (0-6)', required: false })
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  dayOfWeek?: number;

  @ApiProperty({ description: 'Start time (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @ApiProperty({ description: 'End time (ISO string)', required: false })
  @IsDateString()
  @IsOptional()
  endTime?: string;
}
