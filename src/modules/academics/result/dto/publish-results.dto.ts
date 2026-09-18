// src/modules/academics/result/dto/publish-results.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsArray, ArrayMinSize } from 'class-validator';

export class PublishResultsDto {
  @ApiProperty({
    description: 'Term ID to publish results for',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;

  @ApiProperty({
    description: 'Optional: publish only for a specific class',
    example: 'class-123',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classId?: string;

  @ApiProperty({
    description: 'Optional: publish only specific subjects',
    example: ['subject-123', 'subject-456'],
    required: false,
    type: [String],
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @IsOptional()
  subjectIds?: string[];
}
