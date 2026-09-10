// src/modules/academics/attendance/dto/update-attendance.dto.ts

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class UpdateAttendanceDto {
  @ApiProperty({
    description: 'Whether the student was present',
    required: false,
  })
  @IsBoolean()
  @IsOptional()
  present?: boolean;

  @ApiProperty({
    description: 'Optional remarks',
    required: false,
  })
  @IsString()
  @IsOptional()
  remarks?: string;
}
