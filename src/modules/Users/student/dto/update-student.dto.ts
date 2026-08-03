import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class UpdateStudentDto {
  @ApiProperty()
  @IsString()
  address?: string;

  @ApiProperty()
  @IsString()
  medicalNotes?: string;
}
