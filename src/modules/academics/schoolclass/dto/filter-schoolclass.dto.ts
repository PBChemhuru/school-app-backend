// src/modules/academics/class/dto/filter-class.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterSchoolClassDto {
  @ApiProperty({ description: 'Filter by academic year ID', required: false })
  @IsUUID()
  @IsOptional()
  academicYearId?: string;

  @ApiProperty({
    description: 'Filter by grade level',
    example: 'Form 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @ApiProperty({ description: 'Filter by class teacher ID', required: false })
  @IsUUID()
  @IsOptional()
  classTeacherId?: string;

  @ApiProperty({ description: 'Filter by archived status', required: false })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  archived?: boolean;

  @ApiProperty({ description: 'Search by name or room', required: false })
  @IsString()
  @IsOptional()
  search?: string;
}
