// src/modules/academics/subject/dto/update-subject.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class UpdateSubjectDto {
  @ApiProperty({
    description: 'Name of the subject',
    example: 'Advanced Mathematics',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Unique subject code',
    example: 'MATH201',
    required: false,
  })
  @IsString()
  @IsOptional()
  code?: string;

  @ApiProperty({
    description: 'Credit hours for the subject',
    example: 4,
    required: false,
    minimum: 1,
    maximum: 10,
  })
  @IsInt()
  @Min(1)
  @Max(10)
  @IsOptional()
  creditHours?: number;

  @ApiProperty({
    description: 'Subject description',
    example: 'Advanced topics in calculus and linear algebra',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
