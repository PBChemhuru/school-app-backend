import { ApiProperty } from '@nestjs/swagger';
import { QualificationDto } from '../dto/qualification.dto ';
import { UserEntity } from '../../user/entities/user.entity';
import { Prisma } from '@prisma/client';

export class TeacherEntity {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty()
  employeeNumber!: string;

  @ApiProperty({
    required: false,
    nullable: true,
    type: () => QualificationDto,
  })
  qualifications?: Prisma.JsonValue | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  bio?: string | null;

  @ApiProperty({
    required: false,
    nullable: true,
  })
  hireDate?: Date | null;

  @ApiProperty()
  employmentStatus!: string;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({
    required: false,
    type: () => UserEntity,
  })
  user?: UserEntity | null;

  constructor(partial: Partial<TeacherEntity>) {
    Object.assign(this, partial);
  }
}
