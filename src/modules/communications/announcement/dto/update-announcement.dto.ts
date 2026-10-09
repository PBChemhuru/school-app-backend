// src/modules/communication/announcement/dto/update-announcement.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsUUID,
  IsDateString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { AnnouncementScope, AnnouncementAudience } from '@prisma/client';

export class UpdateAnnouncementDto {
  @ApiProperty({
    description: 'Announcement title',
    example: 'Sports Day Postponed',
    required: false,
    maxLength: 150,
  })
  @IsString()
  @IsOptional()
  @MaxLength(150)
  title?: string;

  @ApiProperty({
    description: 'Announcement body',
    required: false,
    maxLength: 5000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(5000)
  body?: string;

  @ApiProperty({
    description: 'Scope',
    enum: AnnouncementScope,
    required: false,
  })
  @IsEnum(AnnouncementScope)
  @IsOptional()
  scope?: AnnouncementScope;

  @ApiProperty({
    description: 'Audience',
    enum: AnnouncementAudience,
    required: false,
  })
  @IsEnum(AnnouncementAudience)
  @IsOptional()
  audience?: AnnouncementAudience;

  @ApiProperty({
    description: 'Class ID (only valid when scope is CLASS)',
    example: 'class-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Publish date/time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  publishAt?: string;

  @ApiProperty({
    description: 'Expiry date/time',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @ApiProperty({
    description: 'Attachment URL',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  attachmentUrl?: string;
}
