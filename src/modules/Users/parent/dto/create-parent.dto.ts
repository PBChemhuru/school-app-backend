import { IsOptional, IsString } from 'class-validator';

import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateParentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  address?: string;
}
