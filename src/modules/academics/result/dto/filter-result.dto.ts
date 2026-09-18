// src/modules/academics/result/dto/filter-result.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsBoolean, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterResultDto {
  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  subjectId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  teacherId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  termId?: string;

  @ApiProperty({ required: false })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Filter by published status',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  published?: boolean;

  @ApiProperty({
    description: 'Filter by grade (e.g., "A", "B+")',
    example: 'A',
    required: false,
  })
  @IsString()
  @IsOptional()
  grade?: string;
}
