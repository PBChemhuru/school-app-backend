import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class ApproveParentStudentLinkDto {
  @ApiProperty()
  @IsBoolean()
  approved!: boolean;
}
