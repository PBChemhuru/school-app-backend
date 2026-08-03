import { ApiProperty } from '@nestjs/swagger';

export class QualificationDto {
  @ApiProperty()
  title!: string;

  @ApiProperty()
  institution!: string;

  @ApiProperty()
  year!: number;
}
