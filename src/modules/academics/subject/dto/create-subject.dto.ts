// src/modules/academics/subject/dto/create-subject.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';

export class CreateSubjectDto {
  @ApiProperty({
    description: 'Name of the subject',
    example: 'Mathematics',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Unique subject code',
    example: 'MATH101',
  })
  @IsString()
  code!: string;

  @ApiProperty({
    description: 'Credit hours for the subject',
    example: 3,
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
    example: 'Introduction to algebra, geometry, and calculus',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;
}
