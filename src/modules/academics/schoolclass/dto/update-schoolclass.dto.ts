// src/modules/academics/class/dto/update-class.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  Min,
  Max,
  IsBoolean,
} from 'class-validator';

export class UpdatesSchoolClassDto {
  @ApiProperty({
    description: 'Name of the class',
    example: 'Form 1A',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Grade level',
    example: 'Form 1',
    required: false,
  })
  @IsString()
  @IsOptional()
  gradeLevel?: string;

  @ApiProperty({ description: 'Section', example: 'A', required: false })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({
    description: 'Room number/location',
    example: 'Room 101',
    required: false,
  })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({
    description: 'Maximum student capacity',
    example: 40,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxCapacity?: number;

  @ApiProperty({
    description: 'Class Teacher ID (set to null to remove)',
    example: 'teacher-456',
    required: false,
    nullable: true,
  })
  @IsUUID()
  @IsOptional()
  classTeacherId?: string;

  @ApiProperty({
    description: 'Whether the class is archived',
    example: false,
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  archived?: boolean;
}
