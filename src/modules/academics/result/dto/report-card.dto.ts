// src/modules/academics/result/dto/report-card.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReportCardQueryDto {
  @ApiProperty({
    description: 'Student ID',
    example: 'student-123',
  })
  @IsUUID()
  studentId!: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;
}

export class ClassReportCardQueryDto {
  @ApiProperty({
    description: 'Class ID',
    example: 'class-123',
  })
  @IsUUID()
  classId!: string;

  @ApiProperty({
    description: 'Term ID',
    example: 'term-123',
  })
  @IsUUID()
  termId!: string;
}
