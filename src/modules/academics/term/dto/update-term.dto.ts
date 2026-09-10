// src/modules/academics/term/dto/update-term.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateTermDto {
  @ApiProperty({
    description: 'Name of the term',
    example: 'Term 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Start date of the term',
    example: '2026-01-15',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'End date of the term',
    example: '2026-03-30',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;

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
