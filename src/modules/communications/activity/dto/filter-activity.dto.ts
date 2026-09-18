// src/modules/academics/activity/dto/filter-activity.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum, IsUUID } from 'class-validator';
import { ActivityCategory } from '@prisma/client';

export class FilterActivityDto {
  @ApiProperty({
    description: 'Filter by category',
    enum: ActivityCategory,
    required: false,
  })
  @IsEnum(ActivityCategory)
  @IsOptional()
  category?: ActivityCategory;

  @ApiProperty({
    description: 'Filter by coordinator (teacher) ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  coordinatorId?: string;

  @ApiProperty({
    description: 'Search by name or description',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}
