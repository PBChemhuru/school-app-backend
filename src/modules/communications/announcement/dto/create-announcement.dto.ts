import { AnnouncementAudience, AnnouncementScope } from '@prisma/client';
import {
  IsDateString,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { ApiProperty } from 'node_modules/@nestjs/swagger/dist/decorators/api-property.decorator';
export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(150)
  title!: string;
  @IsString()
  @MaxLength(5000)
  body!: string;
  @ApiProperty({
    description: 'Scope: SCHOOL for whole school, CLASS for one class',
    enum: AnnouncementScope,
    example: AnnouncementScope.SCHOOL,
    default: AnnouncementScope.SCHOOL,
  })
  @IsEnum(AnnouncementScope)
  scope!: AnnouncementScope;
  @ApiProperty({
    description:
      'Audience: STUDENTS for students, TEACHERS for teachers, PARENTS for parents',
    enum: AnnouncementAudience,
    example: AnnouncementAudience.STUDENTS,
    default: AnnouncementAudience.STUDENTS,
  })
  @IsEnum(AnnouncementAudience)
  audience!: AnnouncementAudience;
  @IsString()
  classId?: string;
  @IsString()
  createdBy!: string;
  @IsString()
  attachmentUrl?: string;
  @ApiProperty({
    description: 'Publish at this date/time. Omit for immediate publish.',
    example: '2026-03-15T08:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  publishAt?: string;

  @ApiProperty({
    description: 'Auto-expire at this date/time. Omit for no expiry.',
    example: '2026-03-16T08:00:00Z',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}
