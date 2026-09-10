// src/modules/academics/timetable/dto/filter-timetable.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterTimetableDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  curriculumId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({ required: false })
  @IsInt()
  @Min(0)
  @Max(6)
  @IsOptional()
  @Type(() => Number)
  dayOfWeek?: number;
}
