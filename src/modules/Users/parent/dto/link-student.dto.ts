// src/modules/parent/dto/link-student.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ParentRelationship } from '@prisma/client';

export class LinkStudentDto {
  @ApiProperty({ description: 'Student admission number' })
  @IsString()
  admissionNumber!: string;

  @ApiProperty({
    description: 'Relationship to student',
    enum: ParentRelationship,
    required: false,
  })
  @IsEnum(ParentRelationship)
  @IsOptional()
  relationship?: ParentRelationship;
}
