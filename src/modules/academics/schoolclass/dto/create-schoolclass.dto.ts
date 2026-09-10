import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, IsInt, Min, Max } from 'class-validator';

export class CreateSchoolclassDto {
  @ApiProperty({
    description: 'Name of the class (e.g., "Form 1A", "Grade 7B")',
    example: 'Form 1A',
  })
  @IsString()
  name!: string;

  @ApiProperty({ description: 'Grade level', example: 'Form 1' })
  @IsString()
  gradeLevel!: string;

  @ApiProperty({
    description: 'Section (A, B, C, etc.)',
    example: 'A',
    required: false,
  })
  @IsString()
  @IsOptional()
  section?: string;

  @ApiProperty({
    description: 'Room number/location',
    example: 'Room 101',
    required: false,
  })
  @IsString()
  @IsOptional()
  room?: string;

  @ApiProperty({
    description: 'Maximum student capacity',
    example: 40,
    required: false,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  maxCapacity?: number;

  @ApiProperty({
    description: 'Academic Year ID',
    example: 'academic-year-123',
  })
  @IsUUID()
  academicYearId!: string;

  @ApiProperty({
    description: 'Class Teacher ID (optional)',
    example: 'teacher-456',
    required: false,
  })
  @IsUUID()
  @IsOptional()
  classTeacherId?: string;
}
