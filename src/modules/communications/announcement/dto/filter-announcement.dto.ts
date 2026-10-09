// src/modules/communication/announcement/dto/filter-announcement.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsString,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AnnouncementScope, AnnouncementAudience } from '@prisma/client';

export class FilterAnnouncementDto {
  @ApiProperty({
    description: 'Filter by scope',
    enum: AnnouncementScope,
    required: false,
  })
  @IsEnum(AnnouncementScope)
  @IsOptional()
  scope?: AnnouncementScope;

  @ApiProperty({
    description: 'Filter by audience',
    enum: AnnouncementAudience,
    required: false,
  })
  @IsEnum(AnnouncementAudience)
  @IsOptional()
  audience?: AnnouncementAudience;

  @ApiProperty({
    description: 'Filter by target class ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Filter by author user ID',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  createdById?: string;

  @ApiProperty({
    description: 'Search in title or body',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiProperty({
    description: 'Only return active announcements (published + not expired)',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  activeOnly?: boolean;

  @ApiProperty({
    description: 'Publish date range — from',
    example: '2026-03-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  fromDate?: string;

  @ApiProperty({
    description: 'Publish date range — to',
    example: '2026-03-31',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  toDate?: string;
}
