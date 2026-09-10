// src/modules/academics/dto/create-academic-year.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsBoolean,
  IsOptional,
  IsUUID,
} from 'class-validator';

export class CreateAcademicYearDto {
  @ApiProperty({
    description: 'Name of the academic year (must be unique)',
    example: '2026 Academic Year',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Start date of the academic year',
    example: '2026-01-15',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'End date of the academic year',
    example: '2026-12-15',
  })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    description: 'Whether this academic year is currently active',
    example: false,
    required: false,
    default: false,
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiProperty({
    description: 'List of term IDs to associate with this academic year',
    required: false,
    type: [String],
  })
  @IsUUID('4', { each: true })
  @IsOptional()
  termIds?: string[];
}
