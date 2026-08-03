import { ApiPropertyOptional } from '@nestjs/swagger';
import { Prisma } from '@prisma/client';
import { IsOptional, IsString } from 'class-validator';
import { QualificationDto } from './qualification.dto ';

export class UpdateTeacherDto {
  @ApiPropertyOptional({
    type: () => QualificationDto,
    nullable: true,
  })
  @IsOptional()
  qualifications?: Prisma.JsonValue | null;

  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  bio?: string | null;
}
