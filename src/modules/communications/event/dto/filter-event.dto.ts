import { ApiProperty } from '@nestjs/swagger';
import { EventType, VisibilityType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class FilterEventDto {
  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  title?: string;
  @ApiProperty({
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;
  @ApiProperty({
    required: false,
  })
  @IsString()
  @IsOptional()
  location?: string;
  @ApiProperty({
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate!: string;
  @ApiProperty({
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate!: string;
  @ApiProperty({
    required: false,
  })
  @IsEnum(EventType)
  @IsOptional()
  eventType!: EventType;
  @ApiProperty({
    required: false,
  })
  @IsEnum(VisibilityType)
  @IsOptional()
  visibilityType?: VisibilityType;

  @ApiProperty({
    description: 'Search by title, description, or location',
    example: 'sports',
    required: false,
  })
  @IsString()
  @IsOptional()
  search?: string;
}
