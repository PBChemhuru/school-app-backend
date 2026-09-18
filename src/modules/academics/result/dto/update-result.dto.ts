// src/modules/academics/result/dto/update-result.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsNumber, Min, Max } from 'class-validator';

export class UpdateResultDto {
  @ApiProperty({
    description: 'Score (0-100)',
    example: 85,
    required: false,
    minimum: 0,
    maximum: 100,
  })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  score?: number;

  @ApiProperty({
    description: 'Optional remarks',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
