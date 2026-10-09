import { ApiProperty } from '@nestjs/swagger';
import { EventType, VisibilityType } from '@prisma/client';
import { IsDateString, IsEnum, IsString } from 'class-validator';

export class CreateEventDto {
  @ApiProperty({
    required: true,
  })
  @IsString()
  title!: string;
  @ApiProperty({
    required: true,
  })
  @IsString()
  description!: string;
  @ApiProperty({
    required: true,
  })
  @IsString()
  location!: string;
  @ApiProperty({
    required: true,
  })
  @IsDateString()
  startDate!: string;
  @ApiProperty({
    required: true,
  })
  @IsDateString()
  endDate!: string;
  @ApiProperty({
    required: true,
  })
  @IsEnum(EventType)
  eventType!: EventType;
  @ApiProperty({
    required: true,
  })
  @IsEnum(VisibilityType)
  visibilityType!: VisibilityType;
}
