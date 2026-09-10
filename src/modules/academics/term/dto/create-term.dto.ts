// src/modules/academics/term/dto/create-term.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsUUID,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class CreateTermDto {
  @ApiProperty({
    description: 'Name of the term',
    example: 'Term 1',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Start date of the term',
    example: '2026-01-15',
  })
  @IsDateString()
  startDate!: string;

  @ApiProperty({
    description: 'End date of the term',
    example: '2026-03-30',
  })
  @IsDateString()
  endDate!: string;

  @ApiProperty({
    description: 'Academic Year ID this term belongs to',
    example: 'academic-year-123',
  })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({
    description: 'Term number (1, 2, 3, etc.)',
    example: 1,
    required: false,
  })
  @IsInt()
  @Min(1)
  @IsOptional()
  termNumber?: number;
}
