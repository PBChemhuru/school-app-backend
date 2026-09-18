// src/modules/academics/activity/dto/create-activity.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  IsInt,
  IsEnum,
  Min,
  Max,
} from 'class-validator';
import { ActivityCategory } from '@prisma/client';

export class CreateActivityDto {
  @ApiProperty({
    description: 'Activity name',
    example: 'Football Team',
  })
  @IsString()
  name!: string;

  @ApiProperty({
    description: 'Short description',
    example: 'School football team for junior boys',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'Category',
    enum: ActivityCategory,
    example: ActivityCategory.SPORTS,
  })
  @IsEnum(ActivityCategory)
  category!: ActivityCategory;

  @ApiProperty({
    description: 'Meeting schedule (free text)',
    example: 'Mondays & Wednesdays, 3pm-5pm',
    required: false,
  })
  @IsString()
  @IsOptional()
  schedule?: string;

  @ApiProperty({
    description: 'Maximum number of members',
    example: 25,
    required: false,
    minimum: 1,
    maximum: 200,
  })
  @IsInt()
  @Min(1)
  @Max(200)
  @IsOptional()
  maxMembers?: number;

  @ApiProperty({
    description: 'Teacher ID who will coordinate this activity',
    example: 'teacher-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  coordinatorId?: string;
}
