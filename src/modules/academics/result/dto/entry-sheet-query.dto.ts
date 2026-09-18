// src/modules/academics/result/dto/entry-sheet-query.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class EntrySheetQueryDto {
  @ApiProperty({
    description: 'Subject ID',
    example: 'subject-123',
  })
  @IsUUID()
  subjectId!: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;

  @ApiProperty({
    description: 'Class ID',
    example: 'class-123',
  })
  @IsUUID()
  classId!: string;
}
