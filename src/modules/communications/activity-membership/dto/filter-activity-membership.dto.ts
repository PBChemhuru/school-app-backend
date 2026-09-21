// src/modules/academics/activity/activity-membership/dto/filter-membership.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsUUID, IsEnum } from 'class-validator';
import { ActivityMembershipStatus } from '@prisma/client';

export class FilterMembershipDto {
  @ApiProperty({
    description: 'Filter by activity ID',
    example: 'activity-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  activityId?: string;

  @ApiProperty({
    description: 'Filter by student ID',
    example: 'student-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  studentId?: string;

  @ApiProperty({
    description: 'Filter by membership status',
    enum: ActivityMembershipStatus,
    example: ActivityMembershipStatus.PENDING,
    required: false,
  })
  @IsEnum(ActivityMembershipStatus)
  @IsOptional()
  status?: ActivityMembershipStatus;
}
