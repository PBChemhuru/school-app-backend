import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { ParentRelationship } from '@prisma/client';

export class LinkStudentDto {
  @ApiProperty({
    description: 'Student admission number',
    example: 'STU-2026-00125',
  })
  @IsString()
  admissionNumber!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(ParentRelationship)
  relationship?: ParentRelationship;
}
