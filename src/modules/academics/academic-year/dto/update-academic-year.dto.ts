// src/modules/academics/dto/update-academic-year.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsDateString, IsBoolean, IsOptional } from 'class-validator';

export class UpdateAcademicYearDto {
  @ApiProperty({
    description: 'Name of the academic year (must be unique)',
    example: '2026 Academic Year',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Start date of the academic year',
    example: '2026-01-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date of the academic year',
    example: '2026-12-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({
    description: 'Whether this academic year is currently active',
    example: true,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
